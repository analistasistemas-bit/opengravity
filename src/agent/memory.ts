import admin from 'firebase-admin';
import { getFirestore, Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { config } from '../config.js';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ChatMessage {
  id?: string;
  user_id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any;
  timestamp?: number;
}

export class Memory {
  private db: Firestore | null = null;

  async init() {
    if (this.db) return;

    console.log(`📡 Memory: Inicializando conexão com Firebase Admin SDK [${config.FB_PROJECT_ID}]...`);

    try {
      if (getApps().length === 0) {
        // Tenta encontrar o arquivo de service account
        const saPath = join(__dirname, '../../service-account.json');

        if (fs.existsSync(saPath)) {
          console.log(`🔑 Memory: Usando credenciais de arquivo: ${saPath}`);
          const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
          initializeApp({
            credential: cert(serviceAccount)
          });
        } else {
          console.log(`🌐 Memory: Arquivo não encontrado, tentando inicialização padrão (Ambiente Cloud)...`);
          initializeApp();
        }
      }

      this.db = getFirestore();
      console.log(`📡 Memory: Admin SDK conectado ao Firestore com sucesso.`);
    } catch (error) {
      console.error("❌ Erro ao inicializar Firebase Admin:", error);
      throw error;
    }
  }

  async addMessage(message: ChatMessage) {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Firestore não inicializado");

    const userMsgsRef = this.db.collection('users').doc(message.user_id.toString()).collection('messages');

    await userMsgsRef.add({
      role: message.role,
      content: message.content,
      name: message.name || null,
      tool_call_id: message.tool_call_id || null,
      tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      timestamp: FieldValue.serverTimestamp()
    });
  }

  async getHistory(userId: number, limitCount: number = 20): Promise<ChatMessage[]> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Firestore não inicializado");

    const userMsgsRef = this.db.collection('users').doc(userId.toString()).collection('messages');
    const querySnapshot = await userMsgsRef
      .orderBy('timestamp', 'desc')
      .limit(limitCount)
      .get();

    const messages: ChatMessage[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        user_id: userId,
        role: data.role,
        content: data.content,
        name: data.name || undefined,
        tool_call_id: data.tool_call_id || undefined,
        tool_calls: data.tool_calls ? JSON.parse(data.tool_calls) : undefined,
        timestamp: data.timestamp?.toMillis()
      });
    });

    return messages.reverse();
  }

  async saveContext(key: string, value: string) {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Firestore não inicializado");

    const contextRef = this.db.collection('context').doc(key);
    await contextRef.set({ value, updatedAt: FieldValue.serverTimestamp() });
  }

  async getContext(key: string): Promise<string | null> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error("Firestore não inicializado");

    const contextRef = this.db.collection('context').doc(key);
    const docSnap = await contextRef.get();

    if (docSnap.exists) {
      return docSnap.data()?.value || null;
    }
    return null;
  }
}
