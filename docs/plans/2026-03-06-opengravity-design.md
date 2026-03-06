# Design do OpenGravity - 2026-03-06

## Visão Geral
O OpenGravity é um agente de IA pessoal local que utiliza o Telegram como interface única. Ele utiliza o padrão ReAct (Reasoning and Acting) para processar mensagens de forma inteligente e interagir com ferramentas locais.

## Arquitetura
O sistema segue uma arquitetura modular em TypeScript (ESM):

- **Core (Bot)**: Gerencia a conexão com o Telegram usando `grammy`.
- **Agente**: Classe central que implementa o loop de pensamento e execução de ferramentas.
- **Ferramentas**: Módulos independentes que o agente pode chamar.
- **Memória**: SQLite (`better-sqlite3`) para persistência de mensagens e estado.

## Fluxo de Mensagens
1. Usuário envia mensagem via Telegram.
2. Bot valida `userId` contra whitelist.
3. Se permitido, delega para `Agent.handleMessage()`.
4. O `Agent` inicia o loop:
   - Chat Completion (Groq) -> Verifica se há chamada de ferramenta.
   - Executa ferramenta localmente se necessário.
   - Repete até obter resposta final ou atingir limite (ex: 5 iterações).
5. Bot envia resposta final para o usuário.

## Armazenamento
- Banco de dados: `data/memory.db`
- Tabela de Mensagens: `id, user_id, role, content, timestamp`
- Tabela de Contexto: `key, value`

## Segurança
- Whitelist de IDs de usuários permitidos no `.env`.
- Logs de acesso para identificar novos IDs.
- Conexão TLS direta com a API do Telegram (long polling).
