import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { config } from '../config.js';
import { Bot } from 'grammy';

export class AudioService {
    /**
     * Faz o download de um arquivo de áudio do Telegram e o transcreve via Groq Whisper.
     */
    static async transcribe(bot: Bot, fileId: string): Promise<string> {
        const tempDirPath = path.join(os.tmpdir(), 'opengravity-audio');
        await fs.ensureDir(tempDirPath);

        const tempFilePath = path.join(tempDirPath, `${fileId}.ogg`);

        try {
            console.log(`🎤 AudioService: Obtendo arquivo ${fileId} do Telegram...`);
            const file = await bot.api.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

            // Download do arquivo
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`Falha ao baixar áudio: ${response.statusText}`);

            const buffer = await response.buffer();
            await fs.writeFile(tempFilePath, buffer);
            console.log(`✅ AudioService: Arquivo salvo temporariamente em ${tempFilePath}`);

            // Enviar para o Groq Whisper
            console.log(`🧠 AudioService: Enviando para Groq Whisper (${config.GROQ_AUDIO_MODEL})...`);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(tempFilePath));
            formData.append('model', config.GROQ_AUDIO_MODEL);
            formData.append('response_format', 'json');
            formData.append('language', 'pt'); // Forçar português

            const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.GROQ_API_KEY}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

            if (!groqResponse.ok) {
                const errorData = await groqResponse.text();
                throw new Error(`Erro na API do Groq: ${groqResponse.status} - ${errorData}`);
            }

            const result = (await groqResponse.json()) as { text: string };
            console.log(`✨ AudioService: Transcrição concluída: "${result.text.substring(0, 50)}..."`);

            return result.text;

        } catch (error) {
            console.error(`❌ AudioService Erro:`, error);
            throw error;
        } finally {
            // Limpeza
            if (await fs.pathExists(tempFilePath)) {
                await fs.remove(tempFilePath);
                console.log(`🧹 AudioService: Arquivo temporário removido.`);
            }
        }
    }
}
