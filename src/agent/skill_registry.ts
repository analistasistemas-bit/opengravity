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

export type SkillDescription = LocalSkill & {
    examples: string[];
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

const SKILL_EXAMPLES: Record<string, string[]> = {
    'algorithmic-art': [
        'crie uma ideia de arte generativa para um poster abstrato',
        'me dê um workflow para gerar arte algorítmica',
    ],
    'brand-guidelines': [
        'me ajude a definir as regras da minha marca',
        'como organizar um brand guide simples?',
    ],
    'canvas-design': [
        'me ajude a compor um layout em canvas',
        'como estruturar uma peça visual em canvas?',
    ],
    'claude-api': [
        'como integrar a Claude API nesse app?',
        'me dê um exemplo de uso da API da Claude',
    ],
    'doc-coauthoring': [
        'me ajude a coescrever um documento',
        'como revisar esse texto em colaboração?',
    ],
    'docx': [
        'como extrair texto de um docx?',
        'me ajude a processar um arquivo word',
    ],
    'frontend-design': [
        'me ajude a desenhar a interface dessa tela',
        'como estruturar o frontend dessa ideia?',
    ],
    'internal-comms': [
        'escreva um comunicado interno para a equipe',
        'me ajude com uma mensagem corporativa interna',
    ],
    'mcp-builder': [
        'como criar um servidor MCP?',
        'me ajude a construir uma integração MCP',
    ],
    'pdf': [
        'como extrair texto de um pdf?',
        'o que posso fazer com esse arquivo pdf?',
    ],
    'pptx': [
        'como resumir essa apresentação pptx?',
        'me ajude a analisar os slides desse powerpoint',
    ],
    'skill-creator': [
        'crie uma nova skill para revisar PRs de segurança',
        'rode evals na minha skill de deploy',
    ],
    'slack-gif-creator': [
        'crie um gif para postar no slack',
        'como gerar um gif curto para um anúncio interno?',
    ],
    'theme-factory': [
        'me ajude a criar um tema visual para o produto',
        'como definir um theme consistente para a interface?',
    ],
    'web-artifacts-builder': [
        'gere artefatos web para essa entrega',
        'como montar os arquivos finais dessa aplicação web?',
    ],
    'webapp-testing': [
        'como testar meu frontend com playwright?',
        'me ajude a validar esse site automaticamente',
    ],
    'xlsx': [
        'como analisar essa planilha xlsx?',
        'me ajude a extrair dados desse excel',
    ],
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

/**
 * Retorna os diretórios de skills em ordem de prioridade.
 * Prioridade: BOT_SKILLS_DIR > ./skills > ~/.codex/skills > ~/.config/claude/skills > ~/.gemini/antigravity/skills
 */
function resolveSkillDirectories(): string[] {
    // 1. Variável de ambiente explícita (máxima prioridade)
    if (process.env.BOT_SKILLS_DIR?.trim()) {
        return [process.env.BOT_SKILLS_DIR.trim()];
    }

    const candidates = [
        // 2. Diretório local do projeto (relativo ao processo)
        path.resolve(process.cwd(), 'skills'),
        // 3. ~/.codex/skills (compatibilidade com instalações Superpowers/Claude Code)
        path.join(os.homedir(), '.codex', 'skills'),
        // 4. ~/.config/claude/skills
        path.join(os.homedir(), '.config', 'claude', 'skills'),
        // 5. ~/.gemini/antigravity/skills
        path.join(os.homedir(), '.gemini', 'antigravity', 'skills'),
    ];

    return candidates.filter((dir) => fs.existsSync(dir));
}

export class SkillRegistry {
    private readonly skillDirs: string[];

    constructor(rootDir?: string) {
        if (rootDir) {
            this.skillDirs = [rootDir];
        } else {
            this.skillDirs = resolveSkillDirectories();
            if (this.skillDirs.length === 0) {
                console.warn('⚠️ SkillRegistry: Nenhum diretório de skills encontrado. Crie ./skills/ ou configure BOT_SKILLS_DIR no .env');
            } else {
                console.log(`📚 SkillRegistry: Skills carregadas de: ${this.skillDirs.join(', ')}`);
            }
        }
    }

    /** Retorna todos os slugs únicos encontrados em todos os diretórios de skills. */
    listSkills(): LocalSkill[] {
        const seen = new Set<string>();
        const results: LocalSkill[] = [];

        for (const dir of this.skillDirs) {
            if (!fs.existsSync(dir)) continue;

            const entries = fs.readdirSync(dir, { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && !seen.has(entry.name));

            for (const entry of entries) {
                seen.add(entry.name);

                const skillPath = path.join(dir, entry.name);
                const skillFile = path.join(skillPath, 'SKILL.md');
                if (!fs.existsSync(skillFile)) {
                    continue;
                }

                const raw = fs.readFileSync(skillFile, 'utf-8');
                const { metadata, body } = parseFrontMatter(raw);
                results.push({
                    slug: entry.name,
                    name: metadata.name || entry.name,
                    description: metadata.description || 'Sem descricao.',
                    guidance: compactBody(body),
                    skillPath,
                });
            }
        }

        return results.sort((a, b) => a.slug.localeCompare(b.slug));
    }

    getSkill(nameOrSlug: string): LocalSkill | null {
        const normalized = nameOrSlug.trim().toLowerCase();
        return this.listSkills().find((skill) =>
            skill.slug.toLowerCase() === normalized || skill.name.toLowerCase() === normalized
        ) || null;
    }

    describeSkill(nameOrSlug: string): SkillDescription | null {
        const skill = this.getSkill(nameOrSlug);
        if (!skill) {
            return null;
        }

        return {
            ...skill,
            examples: SKILL_EXAMPLES[skill.slug] || [
                `para que serve a skill ${skill.slug}?`,
                `me dê exemplos de uso da skill ${skill.slug}`,
            ],
        };
    }

    listSkillSummaries() {
        return this.listSkills().map((skill) => this.describeSkill(skill.slug)!);
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
