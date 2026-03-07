import { googleWorkspaceHandlers } from './src/tools/google_workspace.js';

async function verify() {
    console.log("🔍 Iniciando verificação das ferramentas Google Workspace...");

    try {
        console.log("\n--- Testando Gmail Search ---");
        const gmailResult = await googleWorkspaceHandlers.gmail_search({ query: 'newer_than:1d', limit: 1 });
        console.log("Resultado Gmail:", JSON.stringify(gmailResult, null, 2));

        console.log("\n--- Testando Drive Search ---");
        const driveResult = await googleWorkspaceHandlers.drive_search({ query: 'type:folder' });
        console.log("Resultado Drive:", JSON.stringify(driveResult, null, 2));

        console.log("\n✅ Verificação concluída!");
    } catch (error) {
        console.error("❌ Erro durante a verificação:", error);
    }
}

verify();
