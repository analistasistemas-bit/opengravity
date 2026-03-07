import { execSync } from 'child_process';

/**
 * Executa um comando gog e retorna o resultado.
 */
function runGogCommand(command: string): any {
    try {
        console.log(`📡 Executando: gog ${command} --json --no-input`);
        const output = execSync(`gog ${command} --json --no-input`, { encoding: 'utf-8' });
        return JSON.parse(output);
    } catch (error: any) {
        console.error(`❌ Erro ao executar gog: ${error.message}`);
        return { error: error.stdout || error.message };
    }
}

export const googleWorkspaceTools = [
    {
        type: 'function',
        function: {
            name: 'gmail_search',
            description: 'Pesquisa e-mails no Gmail usando a sintaxe de busca do Google.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Query de busca (ex: "from:exemplo@gmail.com")' },
                    limit: { type: 'number', description: 'Número máximo de resultados (padrão 5)' },
                },
                required: ['query'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'gmail_send',
            description: 'Envia um e-mail simples via Gmail.',
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string', description: 'E-mail do destinatário' },
                    subject: { type: 'string', description: 'Assunto do e-mail' },
                    body: { type: 'string', description: 'Corpo do e-mail (texto puro)' },
                },
                required: ['to', 'subject', 'body'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'calendar_list',
            description: 'Lista eventos do calendário em um intervalo de datas.',
            parameters: {
                type: 'object',
                properties: {
                    calendarId: { type: 'string', description: 'ID do calendário (padrão "primary")' },
                    from: { type: 'string', description: 'Data de início (ISO 8601)' },
                    to: { type: 'string', description: 'Data de fim (ISO 8601)' },
                },
                required: ['from', 'to'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'drive_search',
            description: 'Pesquisa arquivos no Google Drive.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Termo de busca ou query do Drive' },
                },
                required: ['query'],
            },
        },
    },
];

export const googleWorkspaceHandlers = {
    gmail_search: async ({ query, limit = 5 }: { query: string, limit?: number }) => {
        return runGogCommand(`gmail search "${query}" --limit ${limit}`);
    },
    gmail_send: async ({ to, subject, body }: { to: string, subject: string, body: string }) => {
        return runGogCommand(`gmail send --to "${to}" --subject "${subject}" --body "${body}"`);
    },
    calendar_list: async ({ calendarId = 'primary', from, to }: { calendarId?: string, from: string, to: string }) => {
        return runGogCommand(`calendar events "${calendarId}" --from "${from}" --to "${to}"`);
    },
    drive_search: async ({ query }: { query: string }) => {
        return runGogCommand(`drive search "${query}"`);
    },
};
