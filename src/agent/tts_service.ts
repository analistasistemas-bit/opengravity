import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import { config } from '../config.js';

export class TTSService {
    /**
     * Converte texto em áudio usando a API da ElevenLabs e retorna o caminho do arquivo temporário.
     */
    static async generateSpeech(text: string): Promise<string> {
        if (!config.ELEVENLABS_API_KEY) {
            throw new Error("ELEVENLABS_API_KEY não configurada no .env");
        }

        const voiceId = config.ELEVENLABS_VOICE_ID;
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const tempDirPath = path.join(os.tmpdir(), 'opengravity-tts');
        await fs.ensureDir(tempDirPath);
        const tempFilePath = path.join(tempDirPath, `reply_${Date.now()}.mp3`);

        console.log(`🎤 TTSService: Gerando áudio para o texto...`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': config.ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Erro ElevenLabs: ${response.status} - ${errorText}`);
            }

            const buffer = await response.buffer();
            await fs.writeFile(tempFilePath, buffer);
            console.log(`✅ TTSService: Áudio gerado e salvo em ${tempFilePath}`);

            return tempFilePath;
        } catch (error) {
            console.error(`❌ TTSService Erro:`, error);
            throw error;
        }
    }

    /**
     * Remove o arquivo temporário após o uso.
     */
    static async cleanup(filePath: string): Promise<void> {
        if (filePath && await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            console.log(`🧹 TTSService: Arquivo temporário removido: ${filePath}`);
        }
    }
}
