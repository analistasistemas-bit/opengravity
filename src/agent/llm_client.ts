import fetch from 'node-fetch';
import Groq from 'groq-sdk';
import { config } from '../config.js';

type ChatMessage = {
    role: string;
    content: string;
};

type JsonSchemaResponseFormat = {
    type: 'json_schema';
    json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
    };
};

type OpenRouterRequest = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    response_format?: JsonSchemaResponseFormat;
};

type Provider = 'openrouter' | 'groq';

export const plannerResponseSchema: JsonSchemaResponseFormat = {
    type: 'json_schema',
    json_schema: {
        name: 'planner_response',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['respond', 'tool'] },
                response: { type: 'string' },
                toolName: {
                    type: 'string',
                    enum: [
                        'gmail_search', 'gmail_send', 'calendar_list', 'drive_search',
                        'tasks_lists', 'tasks_list', 'tasks_add', 'tasks_delete',
                        'get_current_time', 'list_skills', 'describe_skill'
                    ],
                },
                arguments: {
                    type: 'object',
                    additionalProperties: true,
                },
            },
            required: ['action'],
            additionalProperties: false,
        },
    },
};

export function getPreferredChatProvider(env: NodeJS.ProcessEnv = process.env): Provider {
    if (env.OPENROUTER_API_KEY?.trim()) {
        return 'openrouter';
    }
    return 'groq';
}

export function buildOpenRouterRequestBody(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    responseFormat?: JsonSchemaResponseFormat;
}): OpenRouterRequest {
    return {
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        ...(params.responseFormat ? { response_format: params.responseFormat } : {}),
    };
}

export class LlmClient {
    private readonly groq = new Groq({ apiKey: config.GROQ_API_KEY });

    async createStructuredCompletion(messages: ChatMessage[], schema: JsonSchemaResponseFormat): Promise<string | null> {
        const provider = getPreferredChatProvider();
        if (provider === 'openrouter') {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://github.com/analistasistemas-bit/opengravity',
                        'X-Title': 'OpenGravity',
                    },
                    body: JSON.stringify(buildOpenRouterRequestBody({
                        model: config.OPENROUTER_MODEL,
                        messages,
                        temperature: 0,
                        responseFormat: schema,
                    })),
                });

                if (response.ok) {
                    const json = await response.json() as any;
                    return json.choices?.[0]?.message?.content ?? null;
                }

                const errorText = await response.text();
                console.error(`❌ OpenRouter structured completion failed: ${response.status} - ${errorText}`);
            } catch (error) {
                console.error('❌ OpenRouter structured completion error:', error);
            }
        }

        const groqResponse = await this.groq.chat.completions.create({
            model: config.GROQ_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0,
            messages: messages as any,
        });
        return groqResponse.choices[0].message.content;
    }

    async createTextCompletion(messages: ChatMessage[], temperature: number = 0): Promise<string | null> {
        const provider = getPreferredChatProvider();
        if (provider === 'openrouter') {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
                        'HTTP-Referer': 'https://github.com/analistasistemas-bit/opengravity',
                        'X-Title': 'OpenGravity',
                    },
                    body: JSON.stringify(buildOpenRouterRequestBody({
                        model: config.OPENROUTER_MODEL,
                        messages,
                        temperature,
                    })),
                });

                if (response.ok) {
                    const json = await response.json() as any;
                    return json.choices?.[0]?.message?.content ?? null;
                }

                const errorText = await response.text();
                console.error(`❌ OpenRouter text completion failed: ${response.status} - ${errorText}`);
            } catch (error) {
                console.error('❌ OpenRouter text completion error:', error);
            }
        }

        const groqResponse = await this.groq.chat.completions.create({
            model: config.GROQ_MODEL,
            temperature,
            messages: messages as any,
        });

        return groqResponse.choices[0].message.content;
    }
}
