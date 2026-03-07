import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
    TELEGRAM_ALLOWED_USER_IDS: z.string().default(""),
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
    OPENROUTER_API_KEY: z.string().optional(),
    OPENROUTER_MODEL: z.string().default("openrouter/free"),
    DB_PATH: z.string().default("./data/memory.db"),
    FB_API_KEY: z.string().min(1, "FB_API_KEY is required"),
    FB_AUTH_DOMAIN: z.string().min(1, "FB_AUTH_DOMAIN is required"),
    FB_PROJECT_ID: z.string().min(1, "FB_PROJECT_ID is required"),
    FB_STORAGE_BUCKET: z.string().min(1, "FB_STORAGE_BUCKET is required"),
    FB_MESSAGING_SENDER_ID: z.string().min(1, "FB_MESSAGING_SENDER_ID is required"),
    FB_APP_ID: z.string().min(1, "FB_APP_ID is required"),
    FB_MEASUREMENT_ID: z.string().optional(),
    GROQ_AUDIO_MODEL: z.string().default("whisper-large-v3"),
    ELEVENLABS_API_KEY: z.string().optional(),
    ELEVENLABS_VOICE_ID: z.string().default("XB0fDUndgUByTcfbW97i"), // Charlotte (Multilingual)
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Invalid environment variables:", _env.error.format());
    process.exit(1);
}

export const config = {
    ..._env.data,
    get allowedUserIds(): number[] {
        return this.TELEGRAM_ALLOWED_USER_IDS
            ? this.TELEGRAM_ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
            : [];
    },
    get firebaseConfig(): {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
        measurementId?: string;
    } {
        return {
            apiKey: this.FB_API_KEY,
            authDomain: this.FB_AUTH_DOMAIN,
            projectId: this.FB_PROJECT_ID,
            storageBucket: this.FB_STORAGE_BUCKET,
            messagingSenderId: this.FB_MESSAGING_SENDER_ID,
            appId: this.FB_APP_ID,
            measurementId: this.FB_MEASUREMENT_ID,
        };
    }
};
