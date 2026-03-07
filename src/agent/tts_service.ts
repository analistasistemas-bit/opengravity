import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { config } from '../config.js';

export class TTSService {

    /**
     * Método principal: tenta Microsoft Edge TTS primeiro (gratuito, PT-BR Neural),
     * depois ElevenLabs como fallback.
     */
    static async generateSpeech(text: string): Promise<string> {
        try {
            console.log(`🎤 TTSService: Tentando Microsoft Edge TTS (PT-BR Neural)...`);
            return await TTSService.generateSpeechEdgeTTS(text);
        } catch (edgeError) {
            console.warn(`⚠️ TTSService: Edge TTS falhou, tentando ElevenLabs como fallback...`);
            console.warn(`   Motivo: ${(edgeError as Error).message}`);
            return await TTSService.generateSpeechElevenLabs(text);
        }
    }

    /**
     * Provedor 1 (Principal): Microsoft Edge TTS — gratuito, sem API key.
     * Voz: pt-BR-AntonioNeural (masculina natural) ou pt-BR-FranciscaNeural (feminina).
     */
    private static async generateSpeechEdgeTTS(text: string): Promise<string> {
        const tts = new MsEdgeTTS();
        await tts.setMetadata(
            config.EDGE_TTS_VOICE,
            OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
        );

        const tempDirPath = path.join(os.tmpdir(), 'opengravity-tts');
        await fs.ensureDir(tempDirPath);
        const tempFilePath = path.join(tempDirPath, `reply_${Date.now()}.mp3`);

        await new Promise<void>((resolve, reject) => {
            const { audioStream } = tts.toStream(text);
            const chunks: Buffer[] = [];

            audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            audioStream.on('end', async () => {
                try {
                    await fs.writeFile(tempFilePath, Buffer.concat(chunks));
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            audioStream.on('error', reject);
        });

        console.log(`✅ [Edge TTS]: Áudio gerado com sucesso (voz: ${config.EDGE_TTS_VOICE})`);
        return tempFilePath;
    }

    /**
     * Provedor 2 (Fallback): ElevenLabs Text-to-Speech.
     */
    private static async generateSpeechElevenLabs(text: string): Promise<string> {
        if (!config.ELEVENLABS_API_KEY) {
            throw new Error('Fallback ElevenLabs falhou: ELEVENLABS_API_KEY não configurada no .env');
        }

        const voiceId = config.ELEVENLABS_VOICE_ID;
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

        const tempDirPath = path.join(os.tmpdir(), 'opengravity-tts');
        await fs.ensureDir(tempDirPath);
        const tempFilePath = path.join(tempDirPath, `reply_${Date.now()}.mp3`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': config.ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ElevenLabs retornou ${response.status}: ${errorText}`);
        }

        const buffer = await response.buffer();
        await fs.writeFile(tempFilePath, buffer);
        console.log(`✅ [ElevenLabs]: Áudio gerado com sucesso (fallback)`);

        return tempFilePath;
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
