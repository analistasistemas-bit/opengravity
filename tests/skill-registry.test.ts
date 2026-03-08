import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { SkillRegistry } from '../src/agent/skill_registry.js';

function createSkill(rootDir: string, slug: string, body: string) {
    const skillDir = path.join(rootDir, slug);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), body, 'utf-8');
}

test('SkillRegistry lists installed skills with metadata', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-'));

    createSkill(rootDir, 'pdf', `---
name: pdf
description: Process PDF files
---

# PDF

Extract text from PDFs.`);

    const registry = new SkillRegistry(rootDir);
    const skills = registry.listSkills();

    assert.equal(skills.length, 1);
    assert.equal(skills[0].slug, 'pdf');
    assert.equal(skills[0].description, 'Process PDF files');
    assert.match(skills[0].guidance, /Extract text from PDFs/);
});

test('SkillRegistry matches relevant skills by query', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-registry-'));

    createSkill(rootDir, 'pdf', `---
name: pdf
description: Process PDF files
---

Read and manipulate PDFs.`);

    createSkill(rootDir, 'xlsx', `---
name: xlsx
description: Work with Excel spreadsheets
---

Read and manipulate spreadsheets.`);

    const registry = new SkillRegistry(rootDir);
    const matches = registry.findRelevantSkills('preciso extrair texto de um pdf');

    assert.equal(matches.length, 1);
    assert.equal(matches[0].slug, 'pdf');
});
