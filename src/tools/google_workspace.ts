import { execSync } from 'child_process';

type GogEnvironment = NodeJS.ProcessEnv;
type GogRecord = Record<string, unknown>;
type GmailSearchEmail = {
    id?: string;
    from: string;
    subject: string;
    date?: string;
};

function quoteShellValue(value: string): string {
    return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
}

function commandHasAccountFlag(command: string): boolean {
    return /(^|\s)--account(\s|=)/.test(command);
}

export function buildGogShellCommand(command: string, env: GogEnvironment = process.env): string {
    const gogBinary = env.GOG_BIN || 'gog';
    const accountSegment = env.GOG_ACCOUNT && !commandHasAccountFlag(command)
        ? ` --account ${quoteShellValue(env.GOG_ACCOUNT)}`
        : '';

    return `${gogBinary} ${command}${accountSegment} --json --no-input`;
}

export function buildGogExecOptions(env: GogEnvironment = process.env) {
    const pathSegments = [
        env.HOME ? `${env.HOME}/bin` : undefined,
        env.PATH,
    ].filter(Boolean);

    return {
        encoding: 'utf-8' as const,
        env: {
            ...process.env,
            ...env,
            PATH: pathSegments.join(':'),
        },
    };
}

function asRecord(value: unknown): GogRecord | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as GogRecord
        : null;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function formatDateAsSlash(value: string): string {
    return value.replace(/-/g, '/');
}

function nextDate(dateText: string): string {
    const [year, month, day] = dateText.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + 1);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
}

export function sanitizeGmailQuery(query: string): string {
    const trimmed = query.trim();

    // Fallback defensivo: query vazia retorna inbox recente para não quebrar o gog CLI
    if (!trimmed) {
        return 'in:inbox newer_than:7d';
    }

    const withNormalizedRelativeDate = trimmed.replace(/\bnewer:(\d+[dhmy])\b/g, 'newer_than:$1');
    const match = withNormalizedRelativeDate.match(/\bfrom:(\d{4}-\d{2}-\d{2})\b/);
    if (!match) {
        return withNormalizedRelativeDate;
    }

    const originalDate = match[1];
    const start = formatDateAsSlash(originalDate);
    const end = nextDate(originalDate);
    return withNormalizedRelativeDate.replace(match[0], `after:${start} before:${end}`).trim();
}

function normalizeGmailSearchEmail(entry: unknown): GmailSearchEmail | null {
    const record = asRecord(entry);
    if (!record) {
        return null;
    }

    const fromName = asString(record.fromName) ?? asString(record.name);
    const fromEmail = asString(record.fromEmail) ?? asString(record.email);
    const from = asString(record.from)
        ?? asString(record.sender)
        ?? asString(record.author)
        ?? (fromName && fromEmail ? `${fromName} <${fromEmail}>` : undefined)
        ?? fromName
        ?? fromEmail
        ?? '(remetente desconhecido)';
    const subject = asString(record.subject) ?? asString(record.title) ?? asString(record.snippet) ?? '(sem assunto)';
    const date = asString(record.date) ?? asString(record.internalDate) ?? asString(record.receivedAt);
    const id = asString(record.id) ?? asString(record.threadId) ?? asString(record.messageId);

    return { id, from, subject, date };
}

export function normalizeGmailSearchResult(rawResult: unknown) {
    const rootRecord = asRecord(rawResult);
    const rawItems = Array.isArray(rawResult)
        ? rawResult
        : Array.isArray(rootRecord?.emails)
            ? rootRecord.emails
            : Array.isArray(rootRecord?.results)
                ? rootRecord.results
                : Array.isArray(rootRecord?.messages)
                    ? rootRecord.messages
                    : Array.isArray(rootRecord?.items)
                        ? rootRecord.items
                        : [];

    const emails = rawItems
        .map(normalizeGmailSearchEmail)
        .filter((email): email is GmailSearchEmail => email !== null);

    return {
        count: emails.length,
        emails,
    };
}

/**
 * Executa um comando gog e retorna o resultado.
 */
function runGogCommand(command: string): any {
    try {
        const shellCommand = buildGogShellCommand(command);
        console.log(`📡 Executando: ${shellCommand}`);
        const output = execSync(shellCommand, buildGogExecOptions());
        return JSON.parse(output);
    } catch (error: any) {
        const details = [
            error.stderr?.toString?.(),
            error.stdout?.toString?.(),
            error.message,
        ].filter(Boolean).join('\n').trim();
        console.error(`❌ Erro ao executar gog: ${details}`);
        throw new Error(details || 'Falha ao executar gog.');
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
    {
        type: 'function',
        function: {
            name: 'tasks_lists',
            description: 'Lista todas as listas de tarefas do Google Tasks do usuário.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'Número máximo de listas (padrão 20)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'tasks_list',
            description: 'Lista as tarefas pendentes de uma lista do Google Tasks. Use tasks_lists primeiro para descobrir o ID da lista.',
            parameters: {
                type: 'object',
                properties: {
                    tasklistId: { type: 'string', description: 'ID da lista de tarefas (obtenha via tasks_lists)' },
                    limit: { type: 'number', description: 'Número máximo de tarefas (padrão 20)' },
                    showCompleted: { type: 'boolean', description: 'Incluir tarefas concluídas (padrão false)' },
                },
                required: ['tasklistId'],
            },
        },
    },
];


export const googleWorkspaceHandlers = {
    gmail_search: async ({ query, limit = 5 }: { query: string, limit?: number }) => {
        // Fallback: se o planner gerar query vazia, usa inbox recente
        const safeQuery = query?.trim() || 'in:inbox newer_than:7d';
        const sanitizedQuery = sanitizeGmailQuery(safeQuery);
        const normalized = normalizeGmailSearchResult(runGogCommand(`gmail messages search "${sanitizedQuery}" --max ${limit}`));
        const firstEmail = normalized.emails[0];
        console.log(
            `📬 Gmail search summary: query="${sanitizedQuery}", count=${normalized.count}, first="${firstEmail?.from || '-'} | ${firstEmail?.subject || '-'}"`
        );
        return normalized;
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
    tasks_lists: async ({ limit = 20 }: { limit?: number }) => {
        const result = runGogCommand(`tasks lists --max ${limit}`);
        const items: any[] = Array.isArray(result) ? result
            : Array.isArray(result?.items) ? result.items
                : Array.isArray(result?.taskLists) ? result.taskLists
                    : [];
        return {
            count: items.length,
            lists: items.map((l: any) => ({ id: l.id, title: l.title || l.name || '(sem título)' })),
        };
    },
    tasks_list: async ({ tasklistId, limit = 20, showCompleted = false }: { tasklistId: string, limit?: number, showCompleted?: boolean }) => {
        const flags = showCompleted ? '' : ' --showCompleted false';
        const result = runGogCommand(`tasks list "${tasklistId}" --max ${limit}${flags}`);
        const items: any[] = Array.isArray(result) ? result
            : Array.isArray(result?.items) ? result.items
                : [];
        const tasks = items.map((t: any) => ({
            id: t.id,
            title: t.title || t.name || '(sem título)',
            status: t.status || 'needsAction',
            due: t.due || null,
            notes: t.notes || null,
        }));
        const pending = tasks.filter((t) => t.status !== 'completed');
        console.log(`✅ Tasks list summary: listId="${tasklistId}", total=${tasks.length}, pending=${pending.length}`);
        return { count: tasks.length, pending: pending.length, tasks };
    },
};
