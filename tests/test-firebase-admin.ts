import { Memory } from '../src/agent/memory.js';

async function testConnection() {
    console.log("🧪 Iniciando teste de conexão Cloud Firebase Admin...");
    const memory = new Memory();

    try {
        await memory.init();
        console.log("✅ Inicialização concluída.");

        console.log("📝 Tentando gravar mensagem de teste...");
        await memory.addMessage({
            user_id: 9999,
            role: 'system',
            content: 'Teste de conexão Admin SDK concluído com sucesso. Dados estão na nuvem!'
        });
        console.log("✅ Mensagem gravada.");

        console.log("📖 Tentando ler histórico...");
        const history = await memory.getHistory(9999, 1);
        console.log("✅ Histórico lido:", JSON.stringify(history, null, 2));

        if (history.length > 0) {
            console.log("\n🚀 SUCESSO! A memória está oficialmente conectada ao Firebase na nuvem.");
        } else {
            console.error("❌ Erro: Histórico está vazio.");
        }

    } catch (error) {
        console.error("❌ FALHA no teste:", error);
    } finally {
        process.exit(0);
    }
}

testConnection();
