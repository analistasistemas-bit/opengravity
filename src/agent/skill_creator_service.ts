import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';

type SkillCreatorServiceOptions = {
    skillCreatorDir?: string;
    generatedSkillsDir?: string;
    pythonBin?: string;
};

type CreateSkillInput = {
    name: string;
    description: string;
    trigger: string;
    outputFormat: string;
    withEvals: boolean;
};

type CreatedSkillResult = {
    slug: string;
    skillPath: string;
    validationOutput: string;
};

type EvalLikeInput = {
    skillName: string;
    evalPrompts: string[];
    runs?: number;
};

function escapeShellSegment(value: string): string {
    return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
}

export function buildSkillCreatorScriptCommand(skillCreatorDir: string, scriptName: string, args: string[]): string {
    return `PYTHONPATH=${skillCreatorDir} python3 ${escapeShellSegment(path.join(skillCreatorDir, 'scripts', scriptName))} ${args.map(escapeShellSegment).join(' ')}`.trim();
}

function ensureDir(dirPath: string) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function defaultEvalSet(slug: string, prompts: string[]) {
    return prompts.map((prompt, index) => ({
        query: prompt,
        should_trigger: true,
        id: index + 1,
    }));
}

export class SkillCreatorService {
    private readonly skillCreatorDir: string;
    private readonly generatedSkillsDir: string;
    private readonly pythonBin: string;

    constructor(options: SkillCreatorServiceOptions = {}) {
        this.skillCreatorDir = options.skillCreatorDir || process.env.SKILL_CREATOR_DIR || path.join(os.homedir(), '.codex/skills/skill-creator');
        this.generatedSkillsDir = options.generatedSkillsDir || process.env.GENERATED_SKILLS_DIR || path.join(process.cwd(), 'generated-skills');
        this.pythonBin = options.pythonBin || 'python3';
    }

    private runScript(scriptName: string, args: string[]): string {
        const scriptPath = path.join(this.skillCreatorDir, 'scripts', scriptName);
        return execFileSync(this.pythonBin, [scriptPath, ...args], {
            encoding: 'utf-8',
            env: {
                ...process.env,
                PYTHONPATH: this.skillCreatorDir,
            },
        }).trim();
    }

    private buildSkillMarkdown(input: CreateSkillInput): string {
        return `---
name: ${input.name}
description: ${input.description}
---

# ${input.name}

## When to use

Use this skill whenever ${input.trigger}.

## Output format

${input.outputFormat}
`;
    }

    async createSkill(input: CreateSkillInput): Promise<CreatedSkillResult> {
        ensureDir(this.generatedSkillsDir);
        const skillPath = path.join(this.generatedSkillsDir, input.name);
        if (fs.existsSync(skillPath)) {
            throw new Error(`A skill "${input.name}" ja existe em ${skillPath}.`);
        }

        ensureDir(skillPath);
        fs.writeFileSync(path.join(skillPath, 'SKILL.md'), this.buildSkillMarkdown(input), 'utf-8');

        if (input.withEvals) {
            const evalsDir = path.join(skillPath, 'evals');
            ensureDir(evalsDir);
            fs.writeFileSync(path.join(evalsDir, 'evals.json'), JSON.stringify({
                skill_name: input.name,
                evals: [
                    {
                        id: 1,
                        prompt: `Use a skill ${input.name} em um caso realista.`,
                        expected_output: input.outputFormat,
                        files: [],
                    },
                ],
            }, null, 2), 'utf-8');
        }

        const validationOutput = this.runScript('quick_validate.py', [skillPath]);
        return {
            slug: input.name,
            skillPath,
            validationOutput,
        };
    }

    private resolveSkillPath(skillName: string): string {
        const generatedPath = path.join(this.generatedSkillsDir, skillName);
        if (fs.existsSync(generatedPath)) {
            return generatedPath;
        }

        const installedPath = path.join(process.env.BOT_SKILLS_DIR || path.join(os.homedir(), '.codex/skills'), skillName);
        if (fs.existsSync(installedPath)) {
            return installedPath;
        }

        throw new Error(`Nao encontrei a skill "${skillName}".`);
    }

    private writeTempEvalSet(skillName: string, evalPrompts: string[]): string {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-creator-evals-'));
        const evalPath = path.join(tempDir, 'eval-set.json');
        fs.writeFileSync(evalPath, JSON.stringify(defaultEvalSet(skillName, evalPrompts), null, 2), 'utf-8');
        return evalPath;
    }

    checkRuntimePrerequisites() {
        const claudeBin = process.env.CLAUDE_BIN || 'claude';
        try {
            execFileSync(claudeBin, ['--version'], { stdio: 'ignore' });
            return { ok: true as const };
        } catch {
            return {
                ok: false as const,
                message: 'O runtime do bot nao possui o CLI `claude` instalado e autenticado. Os modos eval/improve/benchmark dependem disso.',
            };
        }
    }

    async runEval(input: EvalLikeInput): Promise<string> {
        const prerequisite = this.checkRuntimePrerequisites();
        if (!prerequisite.ok) {
            throw new Error(prerequisite.message);
        }

        const skillPath = this.resolveSkillPath(input.skillName);
        const evalPath = this.writeTempEvalSet(input.skillName, input.evalPrompts);
        return this.runScript('run_eval.py', [
            '--eval-set', evalPath,
            '--skill-path', skillPath,
            '--runs-per-query', String(input.runs || 2),
        ]);
    }

    async runImprove(input: EvalLikeInput): Promise<string> {
        const prerequisite = this.checkRuntimePrerequisites();
        if (!prerequisite.ok) {
            throw new Error(prerequisite.message);
        }

        const skillPath = this.resolveSkillPath(input.skillName);
        const evalPath = this.writeTempEvalSet(input.skillName, input.evalPrompts);
        return this.runScript('run_loop.py', [
            '--eval-set', evalPath,
            '--skill-path', skillPath,
            '--model', process.env.CLAUDE_MODEL || 'sonnet',
            '--max-iterations', '2',
            '--runs-per-query', String(input.runs || 2),
            '--report', 'none',
        ]);
    }

    async runBenchmark(input: EvalLikeInput): Promise<string> {
        const prerequisite = this.checkRuntimePrerequisites();
        if (!prerequisite.ok) {
            throw new Error(prerequisite.message);
        }

        return this.runEval({
            ...input,
            runs: input.runs || 5,
        });
    }
}
