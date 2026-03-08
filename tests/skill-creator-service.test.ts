import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
    SkillCreatorService,
    buildSkillCreatorScriptCommand,
} from '../src/agent/skill_creator_service.js';

test('buildSkillCreatorScriptCommand injects PYTHONPATH and script path', () => {
    const command = buildSkillCreatorScriptCommand('/skills/skill-creator', 'quick_validate.py', ['skill-dir']);
    assert.match(command, /PYTHONPATH=\/skills\/skill-creator/);
    assert.match(command, /python3 "\/skills\/skill-creator\/scripts\/quick_validate.py" "skill-dir"/);
});

test('SkillCreatorService creates a skill directory with SKILL.md', async () => {
    const generatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-skills-'));
    const skillCreatorDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-creator-'));
    fs.mkdirSync(path.join(skillCreatorDir, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(skillCreatorDir, 'scripts', 'quick_validate.py'), 'print("Skill is valid!")');

    const service = new SkillCreatorService({
        generatedSkillsDir: generatedDir,
        skillCreatorDir,
    });

    const result = await service.createSkill({
        name: 'review-pr-security',
        description: 'Review PRs for security issues',
        trigger: 'Whenever the user asks for a security review',
        outputFormat: 'Bullet list of findings',
        withEvals: true,
    });

    assert.equal(result.slug, 'review-pr-security');
    assert.equal(fs.existsSync(path.join(result.skillPath, 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(result.skillPath, 'evals', 'evals.json')), true);
});
