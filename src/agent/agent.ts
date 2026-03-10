import { config } from '../config.js';
import { Memory, ChatMessage } from './memory.js';
import { toolHandlers } from '../tools/index.js';
import { SkillRegistry, type SkillDescription } from './skill_registry.js';
import type { DocumentActionId, DocumentKind } from './capability_catalog.js';
import { LlmClient, plannerResponseSchema } from './llm_client.js';

export const SYSTEM_PROMPT = 'Voce e o OpenGravity, um assistente pessoal inteligente. Responda sempre em texto natural, em portugues do Brasil. Se precisar consultar Gmail, Google Calendar, Google Drive ou horario atual, planeje a acao em JSON estrito. Nao escreva chamadas de ferramenta em texto, pseudo-XML ou JSON decorado fora do formato solicitado. Cada mensagem deve ser tratada de forma independente do contexto de ferramentas anteriores.';

const PLANNER_PROMPT = `${SYSTEM_PROMPT}

Sua primeira tarefa e escolher a acao correta. Responda SOMENTE JSON valido em um destes formatos:
- {"action":"respond","response":"..."} para resposta direta
- {"action":"tool","toolName":"NOME","arguments":{...}} para executar uma ferramenta

Ferramentas disponiveis:
- gmail_search: buscar emails no Gmail. Args: {query: string, limit?: number}
- gmail_send: enviar email. Args: {to: string, subject: string, body: string}
- calendar_list: listar eventos do Google Calendar. Args: {maxResults?: number}
- drive_search: buscar arquivos no Google Drive. Args: {query: string, limit?: number}
- get_current_time: retorna data e hora atual. Args: {}
- list_skills: lista as skills locais instaladas. Args: {}
- describe_skill: descreve uma skill especifica. Args: {name: string}

Regras importantes:
1. Em consultas de email, nao adicione filtros como is:unread a menos que o usuario peca.
2. Para emails de hoje ou ultimas 24h, use newer_than:1d.
3. Se o usuario perguntar sobre skills, use list_skills ou describe_skill - nunca responda de memoria.
4. Se o usuario mencionar PDF, Word, Excel, PowerPoint ou pedir para analisar um arquivo, oriente-o a ENVIAR O ARQUIVO diretamente no chat - o bot processara automaticamente.
5. Se tiver um bloco de referencias de skill local no contexto, USE o conteudo desse guia para construir sua resposta respond.
6. NUNCA reutilize resultados de ferramentas de mensagens anteriores para responder uma nova pergunta sobre topico diferente.`;

const TOOL_RESULT_PROMPT = `${SYSTEM_PROMPT} Voce recebeu o resultado bruto de uma ferramenta ja executada. Resuma isso para o usuario de forma objetiva e util em portugues. Em Gmail, liste remetente e assunto. Se nao houver resultados, diga isso de forma direta. Se a ferramenta falhou ou retornou erro, diga claramente que houve uma falha na consulta, sem inventar dados. Foque APENAS nesta consulta especifica, ignorando resultados de consultas anteriores na conversa.`;

/** Marcador interno: respostas do assistente geradas por sumarização de ferramenta. */
const TOOL_SUMMARY_MARKER = '__tool_summary__';

type ToolName = 'gmail_search' | 'gmail_send' | 'calendar_list' | 'drive_search' | 'get_current_time' | 'list_skills' | 'describe_skill';

type PlannerResponse =
    | { action: 'respond'; response: string }
    | { action: 'tool'; toolName: ToolName; arguments: Record<string, unknown> };

function asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

function normalizeIntentText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
}

function normalizePlannerArguments(toolName: ToolName, argumentsRecord: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...argumentsRecord };

    if ('limit' in normalized && typeof normalized.limit === 'string') {
        const parsedLimit = Number(normalized.limit);
        if (!Number.isNaN(parsedLimit)) {
            normalized.limit = parsedLimit;
        }
    }

    if (toolName === 'gmail_search' && typeof normalized.query === 'string') {
        normalized.query = normalized.query.trim();
    }

    return normalized;
}

export function inferDeterministicPlan(text: string): PlannerResponse | null {
    const normalized = normalizeIntentText(text);

    if (
        /(quais|que|me mostra|listar|lista).*(skills|habilidades)/.test(normalized) ||
        /(skills|habilidades).*(disponiveis|disponivel|tem|possui|sabe usar)/.test(normalized)
    ) {
        return {
            action: 'tool',
            toolName: 'list_skills',
            arguments: {},
        };
    }

    const skillMatch = normalized.match(/skill\s+([a-z0-9-]+)/);
    if (
        skillMatch &&
        /(para que serve|o que faz|exemplos|exemplo|como usa|como usar|fale sobre|me diga sobre|descreva)/.test(normalized)
    ) {
        return {
            action: 'tool',
            toolName: 'describe_skill',
            arguments: { name: skillMatch[1] },
        };
    }

    return null;
}

export function formatToolResultContent(result: unknown): string {
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}

export function formatDirectToolResponse(toolName: ToolName, toolResult: unknown): string | null {
    if (toolName === 'list_skills' && Array.isArray(toolResult)) {
        const lines = toolResult.map((skill: any) => {
            const examples = Array.isArray(skill.examples) ? skill.examples.slice(0, 2).join(' | ') : '';
            return `- ${skill.slug}: ${skill.description}${examples ? `\n  Ex.: ${examples}` : ''}`;
        });
        return `Skills disponíveis:\n${lines.join('\n')}`;
    }

    if (toolName === 'describe_skill' && toolResult && typeof toolResult === 'object' && !Array.isArray(toolResult)) {
        const skill = toolResult as any;
        if (skill.error) {
            return String(skill.error);
        }
        const examples = Array.isArray(skill.examples) ? skill.examples.join('\n- ') : '';
        return `Skill: ${skill.slug}\nDescrição: ${skill.description}\n${examples ? `Exemplos:\n- ${examples}\n` : ''}Guia resumido: ${skill.guidance}`;
    }

    return null;
}

/**
 * Constrói o histórico conversacional para enviar ao modelo.
 * EXCLUI:
 *  - mensagens role:'tool' (resultados brutos de ferramentas)
 *  - mensagens role:'assistant' com tool_calls (chamadas de ferramenta intermediárias)
 *  - mensagens role:'assistant' marcadas como '__tool_summary__' (sumários gerados por ferramentas)
 *    para evitar que o contexto de uma ferramenta anterior contamine a próxima pergunta.
 */
export function buildModelMessages(history: ChatMessage[]) {
    return history
        .filter((message) => {
            if (message.role === 'user') return true;
            if (message.role === 'assistant') {
                // Exclui chamadas de ferramenta intermediárias
                if (message.tool_calls) return false;
                // Exclui respostas geradas como sumário de ferramenta (evita context bleeding)
                if (message.name === TOOL_SUMMARY_MARKER) return false;
                return true;
            }
            return false;
        })
        .map((message) => ({
            role: message.role,
            content: message.content,
        }));
}

function isStandaloneGreeting(text: string): boolean {
    const normalized = text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();

    return /^(oi+|ola+|opa+|ei+|hey+|bom dia|boa tarde|boa noite|tudo bem\??|e ai|fala|blz|beleza|como vai\??)$/.test(normalized);
}

export function buildPlannerMessages(
    history: ChatMessage[],
    latestText: string,
    systemPrompt: string = SYSTEM_PROMPT,
) {
    const conversation = buildModelMessages(history);
    // Janela de 4 mensagens (2 trocas) para reduzir contaminação de contexto antigo
    const recentConversation = conversation.slice(-4);

    if (isStandaloneGreeting(latestText)) {
        return [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: latestText },
        ];
    }

    return [
        { role: 'system', content: systemPrompt },
        ...recentConversation,
        { role: 'user', content: latestText },
    ];
}

export function parsePlannerResponse(content: string | null | undefined): PlannerResponse | null {
    if (!content) {
        return null;
    }

    try {
        const parsed = JSON.parse(content);
        const record = asObject(parsed);
        if (!record || typeof record.action !== 'string') {
            return null;
        }

        if (record.action === 'respond') {
            const response = asString(record.response);
            return response ? { action: 'respond', response } : null;
        }

        if (record.action === 'tool') {
            const toolName = asString(record.toolName) as ToolName | undefined;
            const argumentsRecord = asObject(record.arguments);
            if (!toolName || !argumentsRecord) {
                return null;
            }

            return {
                action: 'tool',
                toolName,
                arguments: normalizePlannerArguments(toolName, argumentsRecord),
            };
        }
    } catch {
        return null;
    }

    return null;
}

async function executePlannedTool(toolName: ToolName, argumentsRecord: Record<string, unknown>) {
    const handler = toolHandlers[toolName];
    if (!handler) {
        throw new Error(`Ferramenta nao suportada: ${toolName}`);
    }

    return handler(argumentsRecord);
}

export class Agent {
    private llm: LlmClient;
    private memory: Memory;
    private skills: SkillRegistry;

    constructor() {
        this.llm = new LlmClient();
        this.memory = new Memory();
        this.skills = new SkillRegistry();
    }

    private async createPlan(history: ChatMessage[], text: string): Promise<PlannerResponse> {
        const deterministicPlan = inferDeterministicPlan(text);
        if (deterministicPlan) {
            return deterministicPlan;
        }

        const skillGuidance = this.skills.buildGuidanceBlock(text);
        const plannerMessages = buildPlannerMessages(history, text, PLANNER_PROMPT);
        const [systemMessage, ...conversationMessages] = plannerMessages;
        const content = await this.llm.createStructuredCompletion([
            systemMessage,
            ...(skillGuidance ? [{
                role: 'system',
                content: `Referencias locais disponiveis para esta solicitacao. Use como guia de resposta, sem citar nomes internos de skills:\n${skillGuidance}`,
            }] : []),
            ...conversationMessages,
        ] as any, plannerResponseSchema);
        const plan = parsePlannerResponse(content);
        if (!plan) {
            throw new Error(`Planner retornou JSON invalido: ${content}`);
        }

        return plan;
    }

    private async generateFinalResponse(history: ChatMessage[], userText: string, toolName: ToolName, toolResult: unknown): Promise<string> {
        const skillGuidance = this.skills.buildGuidanceBlock(userText);
        const content = await this.llm.createTextCompletion([
            { role: 'system', content: TOOL_RESULT_PROMPT },
            ...(skillGuidance ? [{
                role: 'system',
                content: `Referencias locais disponiveis para esta solicitacao. Use como guia de resposta, sem citar nomes internos de skills:\n${skillGuidance}`,
            }] : []),
            ...buildModelMessages(history),
            { role: 'user', content: userText },
            {
                role: 'assistant',
                content: `Ferramenta executada: ${toolName}\nResultado:\n${formatToolResultContent(toolResult)}`,
            },
        ] as any, 0);

        return content || 'Nao consegui gerar uma resposta.';
    }

    async handleMessage(userId: number, text: string): Promise<string> {
        console.log(`🤖 Agent: Iniciando processamento para usuário ${userId}`);
        const history = await this.memory.getHistory(userId);

        console.log('🧠 Agent: Gerando plano de execucao...');
        const plan = await this.createPlan(history, text);
        console.log(`🧭 Agent: Plano escolhido: ${JSON.stringify(plan)}`);

        await this.memory.addMessage({ user_id: userId, role: 'user', content: text });

        if (plan.action === 'respond') {
            await this.memory.addMessage({ user_id: userId, role: 'assistant', content: plan.response });
            return plan.response;
        }

        const toolResult = await executePlannedTool(plan.toolName, plan.arguments);
        await this.memory.addMessage({
            user_id: userId,
            role: 'tool',
            content: formatToolResultContent(toolResult),
            name: plan.toolName,
        });

        const directResponse = formatDirectToolResponse(plan.toolName, toolResult);
        if (directResponse) {
            // Marcamos como tool_summary para não contaminar o contexto do planner
            await this.memory.addMessage({
                user_id: userId,
                role: 'assistant',
                content: directResponse,
                name: TOOL_SUMMARY_MARKER,
            });
            return directResponse;
        }

        const response = await this.generateFinalResponse(history, text, plan.toolName, toolResult);
        // Marcamos como tool_summary para não contaminar o contexto do planner
        await this.memory.addMessage({
            user_id: userId,
            role: 'assistant',
            content: response,
            name: TOOL_SUMMARY_MARKER,
        });
        return response;
    }

    async summarizeDocumentAction(fileName: string, kind: DocumentKind, action: DocumentActionId, extractedText: string): Promise<string> {
        const content = await this.llm.createTextCompletion([
            {
                role: 'system',
                content: 'Voce e o OpenGravity. Resuma documentos de forma objetiva, em portugues. Para PDFs e DOCX, destaque assunto principal, pontos importantes e proximos passos. Para planilhas, destaque abas e principais dados. Para apresentacoes, destaque o tema e os pontos por slide. Nao invente conteudo ausente.',
            },
            {
                role: 'user',
                content: `Arquivo: ${fileName}\nTipo: ${kind}\nAcao: ${action}\nConteudo extraido:\n${extractedText.slice(0, 16000)}`,
            },
        ] as any, 0);

        return content || 'Nao consegui resumir o documento.';
    }

    listAvailableSkills(): SkillDescription[] {
        return this.skills.listSkillSummaries();
    }

    getSkillByName(nameOrSlug: string): SkillDescription | null {
        return this.skills.describeSkill(nameOrSlug);
    }

    /** Apaga o histórico de memória do usuário. Retorna a quantidade de mensagens deletadas. */
    async clearMemory(userId: number): Promise<number> {
        return this.memory.clearHistory(userId);
    }
}
