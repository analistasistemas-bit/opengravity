import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { config } from '../config.js';
import { Memory, ChatMessage } from './memory.js';
import { tools, toolHandlers } from '../tools/index.js';

export const SYSTEM_PROMPT = 'Você é o OpenGravity, um assistente de IA pessoal e inteligente. REGRA ABSOLUTA: você SEMPRE responde em texto normalmente — o sistema converte automaticamente seu texto em áudio para o usuário ouvir. NUNCA diga que não pode falar ou produzir áudio. Quando o usuário pedir uma resposta em áudio ou voz, simplesmente responda em texto como faria normalmente — o sistema fará a conversão. Você tem acesso a ferramentas para ajudar o usuário. Quando usar resultados do Gmail, responda objetivamente com remetente e assunto dos e-mails encontrados. Se houver data disponível, você pode incluí-la. Não diga que não pode exibir os resultados se a ferramenta já retornou os dados. Em consultas de e-mail, não adicione filtros extras (como is:unread ou in:inbox) a menos que o usuário peça explicitamente. Quando precisar usar uma ferramenta, use apenas a tools API da plataforma. Nunca escreva <function=...>, pseudo-XML ou chamadas de ferramenta inline no texto.';

export function formatToolResultContent(result: unknown): string {
    if (typeof result === 'string') {
        return result;
    }

    return JSON.stringify(result, null, 2);
}

export function buildModelMessages(history: ChatMessage[]): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
    ];

    for (const message of history) {
        if (message.role === 'user' && message.content) {
            messages.push({ role: 'user', content: message.content });
            continue;
        }

        if (message.role === 'assistant' && message.content && !message.tool_calls) {
            messages.push({ role: 'assistant', content: message.content });
        }
    }

    return messages;
}

type ParsedToolCall = {
    name: string;
    arguments: Record<string, unknown>;
};

function asObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function normalizeToolArguments(toolName: string, argumentsRecord: Record<string, unknown>): Record<string, unknown> {
    if ((toolName === 'gmail_search' || toolName === 'drive_search') && typeof argumentsRecord.limit === 'string') {
        const parsedLimit = Number(argumentsRecord.limit);
        if (!Number.isNaN(parsedLimit)) {
            argumentsRecord.limit = parsedLimit;
        }
    }

    return argumentsRecord;
}

export function parseToolCallFromText(content: string | null | undefined): ParsedToolCall | null {
    if (!content) {
        return null;
    }

    const trimmed = content.trim();

    try {
        const parsed = JSON.parse(trimmed);
        const record = asObject(parsed);
        const parameters = asObject(record?.parameters);
        if (record?.type === 'function' && typeof record.name === 'string' && parameters) {
            return {
                name: record.name,
                arguments: parameters,
            };
        }
    } catch {
        // Fall through to the pseudo-XML parser.
    }

    const functionStart = trimmed.indexOf('<function=');
    const functionEnd = trimmed.indexOf('</function>');
    if (functionStart === -1 || functionEnd === -1 || functionEnd <= functionStart) {
        return null;
    }

    const rawBody = trimmed
        .slice(functionStart + '<function='.length, functionEnd)
        .trim();
    const bodyStartIndex = rawBody.indexOf('{');
    if (bodyStartIndex === -1) {
        return null;
    }

    const functionName = rawBody
        .slice(0, bodyStartIndex)
        .trim()
        .replace(/[=>\s]+$/g, '');
    const rawArguments = rawBody.slice(bodyStartIndex).trim().replace(/>$/, '');
    if (!functionName || !rawArguments) {
        return null;
    }

    try {
        const parsedArguments = JSON.parse(rawArguments);
        const argumentsRecord = asObject(parsedArguments);
        if (!argumentsRecord) {
            return null;
        }

        return {
            name: functionName,
            arguments: normalizeToolArguments(functionName, argumentsRecord),
        };
    } catch {
        return null;
    }
}

function extractToolUseFailure(error: unknown): ParsedToolCall | null {
    if (!error || typeof error !== 'object') {
        return null;
    }

    const groqError = error as {
        error?: {
            error?: {
                code?: string;
                failed_generation?: string;
            };
        };
    };

    if (groqError.error?.error?.code !== 'tool_use_failed') {
        return null;
    }

    return parseToolCallFromText(groqError.error.error.failed_generation);
}

function buildSyntheticToolCall(parsedToolCall: ParsedToolCall, iteration: number) {
    return {
        id: `fallback_tool_call_${iteration}_${Date.now()}`,
        type: 'function' as const,
        function: {
            name: parsedToolCall.name,
            arguments: JSON.stringify(parsedToolCall.arguments),
        },
    };
}

export class Agent {
    private groq: Groq;
    private memory: Memory;

    constructor() {
        this.groq = new Groq({ apiKey: config.GROQ_API_KEY });
        this.memory = new Memory();
    }

    async handleMessage(userId: number, text: string): Promise<string> {
        console.log(`🤖 Agent: Iniciando processamento para usuário ${userId}`);
        // Adiciona mensagem do usuário à memória
        await this.memory.addMessage({ user_id: userId, role: 'user', content: text });
        const history = await this.memory.getHistory(userId);
        const messages = buildModelMessages(history);

        let iterations = 0;
        const maxIterations = 5;

        while (iterations < maxIterations) {
            console.log(`🧠 Agent: Enviando contexto para Groq (Iteração ${iterations + 1})...`);
            let completion;
            try {
                completion = await this.groq.chat.completions.create({
                    model: config.GROQ_MODEL,
                    messages,
                    tools: tools as any,
                    tool_choice: 'auto',
                    parallel_tool_calls: false,
                    temperature: 0,
                });
            } catch (error) {
                const failedToolCall = extractToolUseFailure(error);
                if (failedToolCall) {
                    completion = {
                        choices: [
                            {
                                message: {
                                    content: null,
                                    tool_calls: [buildSyntheticToolCall(failedToolCall, iterations)],
                                },
                            },
                        ],
                    } as any;
                } else {
                    throw error;
                }
            }

            const message = completion.choices[0].message;
            console.log(`✅ Agent: Resposta do Groq recebida. Content: "${message.content}", ToolCalls: ${message.tool_calls?.length || 0}`);

            const contentToolCall = !message.tool_calls || message.tool_calls.length === 0
                ? parseToolCallFromText(message.content)
                : null;

            if (contentToolCall) {
                message.tool_calls = [buildSyntheticToolCall(contentToolCall, iterations)];
                message.content = null;
            }

            // Adiciona a mensagem do assistente ao histórico para a próxima iteração
            // Se não houver chamadas de ferramenta, terminamos
            if (!message.tool_calls || message.tool_calls.length === 0) {
                const content = message.content || "";
                await this.memory.addMessage({ user_id: userId, role: 'assistant', content });
                return content;
            }

            // Adiciona a intenção do assistente de usar ferramentas
            await this.memory.addMessage({
                user_id: userId,
                role: 'assistant',
                content: message.content || "",
                name: undefined,
                tool_call_id: undefined,
                tool_calls: message.tool_calls
            });
            messages.push({
                role: 'assistant',
                content: message.content || null,
                tool_calls: message.tool_calls as any,
            });

            // Executa as ferramentas
            for (const toolCall of message.tool_calls) {
                const handler = toolHandlers[toolCall.function.name];
                if (handler) {
                    console.log(`🔧 Executando ferramenta: ${toolCall.function.name}`);
                    const result = await handler(JSON.parse(toolCall.function.arguments));
                    const content = formatToolResultContent(result);

                    await this.memory.addMessage({
                        user_id: userId,
                        role: 'tool',
                        content,
                        name: toolCall.function.name,
                        tool_call_id: toolCall.id
                    });
                    messages.push({
                        role: 'tool',
                        content,
                        tool_call_id: toolCall.id,
                    });
                }
            }

            iterations++;
        }

        return "Desculpe, atingi o limite de processamento para essa solicitação.";
    }
}
