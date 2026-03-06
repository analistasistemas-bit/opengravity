import Groq from 'groq-sdk';
import { config } from '../config.js';
import { Memory, ChatMessage } from './memory.js';
import { tools, toolHandlers } from '../tools/index.js';

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

        let iterations = 0;
        const maxIterations = 5;

        while (iterations < maxIterations) {
            const history = await this.memory.getHistory(userId);
            const messages = [
                { role: 'system', content: 'Você é o OpenGravity, um agente de IA pessoal prestativo e seguro. Você funciona localmente e tem acesso a ferramentas para ajudar o usuário.' },
                ...history.map(m => ({
                    role: m.role,
                    content: m.content,
                    name: m.name,
                    tool_call_id: m.tool_call_id,
                    tool_calls: m.tool_calls
                }))
            ];

            console.log(`🧠 Agent: Enviando contexto para Groq (Iteração ${iterations + 1})...`);
            const completion = await this.groq.chat.completions.create({
                model: config.GROQ_MODEL,
                messages: messages as any,
                tools: tools as any,
                tool_choice: 'auto',
            });

            const message = completion.choices[0].message;
            console.log(`✅ Agent: Resposta do Groq recebida. Content: "${message.content}", ToolCalls: ${message.tool_calls?.length || 0}`);

            // Adiciona a mensagem do assistente ao histórico para a próxima iteração
            // (Isso é importante para o loop ReAct funcionar na iteração seguinte)
            history.push({
                user_id: userId,
                role: 'assistant',
                content: message.content || "",
                tool_calls: message.tool_calls
            });

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

            // Executa as ferramentas
            for (const toolCall of message.tool_calls) {
                const handler = toolHandlers[toolCall.function.name];
                if (handler) {
                    console.log(`🔧 Executando ferramenta: ${toolCall.function.name}`);
                    const result = await handler(JSON.parse(toolCall.function.arguments));

                    await this.memory.addMessage({
                        user_id: userId,
                        role: 'tool',
                        content: String(result),
                        name: toolCall.function.name,
                        tool_call_id: toolCall.id
                    });
                }
            }

            iterations++;
        }

        return "Desculpe, atingi o limite de processamento para essa solicitação.";
    }
}
