import { Bot } from 'grammy';
import nodeFetch from 'node-fetch';
import https from 'https';
import { config } from './config.js';
import { Agent } from './agent/agent.js';

// Força uso de IPv4 para evitar ETIMEDOUT causado por roteamento IPv6 no macOS
const httpsAgent = new https.Agent({ family: 4 });

const bot = new Bot(config.TELEGRAM_BOT_TOKEN, {
    client: {
        baseFetchConfig: { agent: httpsAgent } as any,
    }
});
const agent = new Agent();

// Middleware de Log e Segurança
bot.use(async (ctx, next) => {
    const from = ctx.from;
    if (!from) return;

    const userId = from.id;
    const username = from.username || from.first_name;

    // Log no console para ajudar o usuário a encontrar seu ID
    console.log(`📩 Mensagem recebida de [${username}] (ID: ${userId})`);

    const allowedIds = config.allowedUserIds;

    // Se a whitelist estiver vazia, permitimos o primeiro para facilitar o setup
    // OU se o ID estiver na lista
    if (allowedIds.length === 0 || allowedIds.includes(userId)) {
        return next();
    }

    console.warn(`⚠️ Acesso NEGADO para ID: ${userId}`);
    await ctx.reply("Acesso não autorizado. Por favor, configure seu ID no arquivo .env.");
});

// Handler de Mensagens
bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    console.log(`📨 Recebido: "${text}" de ${userId}`);

    // Mostra que o bot está "digitando"
    await ctx.replyWithChatAction('typing');
    console.log(`✍️ Chat action 'typing' enviado.`);

    try {
        console.log(`🤖 Chamando agent.handleMessage...`);
        const response = await agent.handleMessage(userId, text);
        console.log(`📤 Resposta gerada: "${response.substring(0, 50)}..."`);
        await ctx.reply(response);
        console.log(`✅ Mensagem enviada para o usuário.`);
    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error);
        await ctx.reply("Desculpe, ocorreu um erro interno ao processar sua mensagem.");
    }
});

// Comandos básicos
bot.command('start', (ctx) => ctx.reply('Olá! Eu sou o OpenGravity, seu agente pessoal local. Como posso ajudar hoje?'));
bot.command('id', (ctx) => ctx.reply(`Seu ID do Telegram é: ${ctx.from?.id}`));

// Inicialização
console.log("🚀 OpenGravity está iniciando...");
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} online! (Long Polling)`);
        if (config.allowedUserIds.length === 0) {
            console.warn("❗ ATENÇÃO: Whitelist vazia. Adicione seu ID ao .env para segurança.");
        }
    },
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
