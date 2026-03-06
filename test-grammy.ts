import { Bot } from 'grammy';
import nodeFetch from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const agent = new https.Agent({ family: 4 });

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string, {
    client: {
        fetch: ((url: any, init?: any) => nodeFetch(url, { ...init, agent })) as typeof fetch,
    }
});

console.log("✅ Bot configurado com node-fetch + IPv4 forçado. Iniciando...");
bot.start({
    onStart: (botInfo) => { console.log(`🟢 Bot @${botInfo.username} online!`); }
}).catch((e) => console.error("❌ Erro no bot.start():", e));
