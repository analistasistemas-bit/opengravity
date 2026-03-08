import fs from 'fs';
import os from 'os';
import path from 'path';

export type LocalSkill = {
    slug: string;
    name: string;
    description: string;
    guidance: string;
    skillPath: string;
};

const SKILL_ALIASES: Record<string, string[]> = {
    'algorithmic-art': ['arte', 'art', 'generativa', 'canvas', 'visual'],
    'brand-guidelines': ['marca', 'branding', 'brand', 'identidade visual'],
    'canvas-design': ['canvas', 'design', 'layout', 'composicao'],
    'claude-api': ['api', 'claude', 'anthropic', 'llm'],
    'doc-coauthoring': ['documento', 'coautoria', 'edicao', 'redacao'],
    'docx': ['docx', 'word', 'documento', 'office'],
    'frontend-design': ['frontend', 'ui', 'ux', 'interface', 'site'],
    'internal-comms': ['comunicacao interna', 'memorando', 'announcement', 'anuncio'],
    'mcp-builder': ['mcp', 'server', 'tooling'],
    'pdf': ['pdf', 'relatorio', 'scan', 'ocr'],
    'pptx': ['ppt', 'pptx', 'powerpoint', 'slides', 'apresentacao'],
    'skill-creator': ['skill', 'habilidade', 'workflow'],
    'slack-gif-creator': ['slack', 'gif'],
    'theme-factory': ['tema', 'theme', 'design system'],
    'web-artifacts-builder': ['artifact', 'web artifact', 'bundle'],
    'webapp-testing': ['teste', 'playwright', 'webapp', 'browser', 'site'],
    'xlsx': ['xlsx', 'excel', 'planilha', 'spreadsheet'],
};

function parseFrontMatter(raw: string): { metadata: Record<string, string>; body: string } {
    if (!raw.startsWith('---')) {
        return { metadata: {}, body: raw };
    }

    const endIndex = raw.indexOf('\n---', 3);
    if (endIndex === -1) {
        return { metadata: {}, body: raw };
    }

    const frontMatter = raw.slice(3, endIndex).trim();
    const body = raw.slice(endIndex + 4).trim();
    const metadata: Record<string, string> = {};

    for (const line of frontMatter.split('\n')) {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex === -1) {
            continue;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        metadata[key] = value.replace(/^["']|["']$/g, '');
    }

    return { metadata, body };
}

function compactBody(body: string, maxLength: number = 1600): string {
    const withoutCodeBlocks = body.replace(/```[\s\S]*?```/g, ' ');
    const singleSpaced = withoutCodeBlocks.replace(/\s+/g, ' ').trim();
    return singleSpaced.length > maxLength
        ? `${singleSpaced.slice(0, maxLength)}...`
        : singleSpaced;
}

function tokenize(text: string): string[] {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((token) => token.length >= 2);
}

export class SkillRegistry {
    constructor(
        private readonly rootDir: string = process.env.BOT_SKILLS_DIR || path.join(os.homedir(), '.codex/skills'),
    ) {}

    listSkills(): LocalSkill[] {
        if (!fs.existsSync(this.rootDir)) {
            return [];
        }

        return fs.readdirSync(this.rootDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
            .map((entry) => {
                const skillPath = path.join(this.rootDir, entry.name);
                const skillFile = path.join(skillPath, 'SKILL.md');
                if (!fs.existsSync(skillFile)) {
                    return null;
                }

                const raw = fs.readFileSync(skillFile, 'utf-8');
                const { metadata, body } = parseFrontMatter(raw);
                return {
                    slug: entry.name,
                    name: metadata.name || entry.name,
                    description: metadata.description || 'Sem descricao.',
                    guidance: compactBody(body),
                    skillPath,
                } satisfies LocalSkill;
            })
            .filter((skill): skill is LocalSkill => skill !== null)
            .sort((a, b) => a.slug.localeCompare(b.slug));
    }

    getSkill(nameOrSlug: string): LocalSkill | null {
        const normalized = nameOrSlug.trim().toLowerCase();
        return this.listSkills().find((skill) =>
            skill.slug.toLowerCase() === normalized || skill.name.toLowerCase() === normalized
        ) || null;
    }

    findRelevantSkills(query: string, limit: number = 3): LocalSkill[] {
        const tokens = tokenize(query);
        if (tokens.length === 0) {
            return [];
        }

        return this.listSkills()
            .map((skill) => {
                const aliases = SKILL_ALIASES[skill.slug] || [];
                const haystack = tokenize(`${skill.slug} ${skill.name} ${skill.description} ${aliases.join(' ')}`);
                const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
                return { skill, score };
            })
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score || a.skill.slug.localeCompare(b.skill.slug))
            .slice(0, limit)
            .map((entry) => entry.skill);
    }

    buildGuidanceBlock(query: string): string | null {
        const matches = this.findRelevantSkills(query);
        if (matches.length === 0) {
            return null;
        }

        return matches.map((skill) => (
            `Skill local: ${skill.slug}\nDescricao: ${skill.description}\nGuia resumido: ${skill.guidance}`
        )).join('\n\n');
    }
}
