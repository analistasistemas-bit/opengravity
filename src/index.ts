import { Bot, InputFile } from 'grammy';
import nodeFetch from 'node-fetch';
import https from 'https';
import { config } from './config.js';
import { Agent } from './agent/agent.js';
import { AudioService } from './agent/audio_service.js';
import { TTSService } from './agent/tts_service.js';
import { createPerUserSerialExecutor } from './lib/per_user_queue.js';
import { buildDocumentActionPrompt, getDocumentCapability } from './agent/capability_catalog.js';
import { DocumentService, parseDocumentActionReply } from './agent/document_service.js';
import { PendingDocumentJobs } from './lib/pending_document_jobs.js';

// Força uso de IPv4 para evitar ETIMEDOUT causado por roteamento IPv6 no macOS
const httpsAgent = new https.Agent({ family: 4 });

const bot = new Bot(config.TELEGRAM_BOT_TOKEN, {
    client: {
        baseFetchConfig: { agent: httpsAgent } as any,
    }
});
const agent = new Agent();
const runPerUserSerial = createPerUserSerialExecutor<void>();
const pendingDocumentJobs = new PendingDocumentJobs();

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

// Handler de Áudio
bot.on('message:voice', async (ctx) => {
    await runPerUserSerial(String(ctx.from.id), async () => {
        const userId = ctx.from.id;
        const fileId = ctx.message.voice.file_id;
        console.log(`🎤 Áudio recebido de ${userId}. FileID: ${fileId}`);

        await ctx.replyWithChatAction('typing');
        const msg = await ctx.reply("👂 Estou ouvindo...");

        try {
            const text = await AudioService.transcribe(bot, fileId);
            console.log(`📝 Transcrição obtida: "${text}"`);

            await bot.api.editMessageText(ctx.chat.id, msg.message_id, `📝 *" ${text} "*`);
            await ctx.replyWithChatAction('typing');

            const response = await agent.handleMessage(userId, text);
            await ctx.reply(response);

            try {
                await ctx.replyWithChatAction('record_voice');
                const audioPath = await TTSService.generateSpeech(response);
                await ctx.replyWithVoice(new InputFile(audioPath));
                await TTSService.cleanup(audioPath);
            } catch (ttsError) {
                console.error("⚠️ Falha ao gerar resposta por voz:", ttsError);
            }
        } catch (error) {
            console.error("❌ Erro ao processar áudio:", error);
            await bot.api.editMessageText(ctx.chat.id, msg.message_id, "❌ Desculpe, não consegui entender o áudio.");
        }
    });
});

// Handler de Mensagens
bot.on('message:text', async (ctx) => {
    await runPerUserSerial(String(ctx.from.id), async () => {
        const userId = ctx.from.id;
        const text = ctx.message.text;
        console.log(`📨 Recebido: "${text}" de ${userId}`);

        await ctx.replyWithChatAction('typing');
        console.log(`✍️ Chat action 'typing' enviado.`);

        try {
            const pendingJob = pendingDocumentJobs.get(userId);
            const requestedAction = pendingJob ? parseDocumentActionReply(text) : null;

            if (pendingJob && requestedAction && pendingJob.actions.includes(requestedAction)) {
                console.log(`📄 Executando ação pendente em documento: ${requestedAction}`);
                const rawResult = await DocumentService.runAction(pendingJob.filePath, pendingJob.fileName, requestedAction);
                const response = requestedAction === 'summarize'
                    ? await agent.summarizeDocumentAction(pendingJob.fileName, pendingJob.kind, requestedAction, rawResult)
                    : rawResult.slice(0, 3800) || 'Nao encontrei conteudo no documento.';

                await ctx.reply(response);
                pendingDocumentJobs.clear(userId);
                await DocumentService.cleanup(pendingJob.filePath);
                return;
            }

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
});

bot.on('message:document', async (ctx) => {
    await runPerUserSerial(String(ctx.from.id), async () => {
        const userId = ctx.from.id;
        const document = ctx.message.document;
        const fileName = document.file_name || 'arquivo';
        const capability = getDocumentCapability(fileName);

        await ctx.replyWithChatAction('typing');

        if (!capability) {
            await ctx.reply(`Recebi \`${fileName}\`, mas esse tipo de arquivo ainda nao tem workflow de execução no bot. Posso te orientar sobre como trabalhar com ele.`, {
                parse_mode: 'Markdown',
            });
            return;
        }

        try {
            const filePath = await DocumentService.downloadTelegramDocument(bot, document.file_id, fileName);
            pendingDocumentJobs.set(userId, {
                fileName,
                filePath,
                kind: capability.kind,
                actions: capability.actions.map((action) => action.id),
            });

            await ctx.reply(buildDocumentActionPrompt(fileName, capability), {
                parse_mode: 'Markdown',
            });
        } catch (error) {
            console.error('❌ Erro ao processar documento:', error);
            await ctx.reply('Nao consegui baixar ou preparar esse documento.');
        }
    });
});

// Comandos básicos
bot.command('start', (ctx) => ctx.reply('Olá! Eu sou o OpenGravity, seu agente pessoal local. Como posso ajudar hoje?'));
bot.command('id', (ctx) => ctx.reply(`Seu ID do Telegram é: ${ctx.from?.id}`));
bot.command('skills', (ctx) => {
    const skills = agent.listAvailableSkills();
    if (skills.length === 0) {
        return ctx.reply('Nenhuma skill local encontrada no ambiente do bot.');
    }

    const lines = skills.map((skill) => `- ${skill.slug}: ${skill.description}`);
    return ctx.reply(`Skills locais disponíveis:\n${lines.join('\n')}`);
});

bot.command('skill', (ctx) => {
    const text = ctx.message?.text || '';
    const [, ...parts] = text.split(' ');
    const target = parts.join(' ').trim();

    if (!target) {
        return ctx.reply('Use `/skill nome-da-skill` para ver detalhes.', { parse_mode: 'Markdown' });
    }

    const skill = agent.getSkillByName(target);
    if (!skill) {
        return ctx.reply(`Não encontrei a skill "${target}". Use /skills para listar as disponíveis.`);
    }

    return ctx.reply(
        `Skill: ${skill.slug}\nDescrição: ${skill.description}\nGuia resumido: ${skill.guidance.slice(0, 1200)}`,
    );
});

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
