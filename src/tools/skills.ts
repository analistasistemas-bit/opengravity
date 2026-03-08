import { SkillRegistry } from '../agent/skill_registry.js';

const registry = new SkillRegistry();

export const skillTools = [
    {
        type: 'function',
        function: {
            name: 'list_skills',
            description: 'Lista as skills locais disponíveis, com descrição curta e exemplos de uso.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'describe_skill',
            description: 'Descreve para que serve uma skill local, quando usar e dá exemplos práticos.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Nome ou slug da skill' },
                },
                required: ['name'],
            },
        },
    },
];

export const skillHandlers = {
    list_skills: () => registry.listSkillSummaries(),
    describe_skill: ({ name }: { name: string }) => {
        const description = registry.describeSkill(name);
        if (!description) {
            return { error: `Skill "${name}" não encontrada.` };
        }
        return description;
    },
};
