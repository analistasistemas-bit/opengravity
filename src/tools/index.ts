import { googleWorkspaceTools, googleWorkspaceHandlers } from './google_workspace.js';

export const tools = [
    ...googleWorkspaceTools,
    {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Retorna a data e hora atual do sistema.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
];

export const toolHandlers: Record<string, Function> = {
    ...googleWorkspaceHandlers,
    get_current_time: () => {
        return new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' });
    },
};
