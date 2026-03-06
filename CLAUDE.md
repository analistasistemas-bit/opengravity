# OpenGravity - Guia do Engenheiro de Software

Este documento serve como o guia principal para o desenvolvimento do OpenGravity. Todas as tarefas de engenharia e desenvolvimento devem seguir este guia.

## Tecnologias Core
- **Linguagem**: TypeScript (ES Modules)
- **Runtime**: Node.js com `tsx` para desenvolvimento
- **Telegram Bot**: `grammy`
- **LLM**: Groq API (fallback para OpenRouter)
- **Banco de Dados**: SQLite (`better-sqlite3`)
- **Configuração**: `.env` para credenciais e variáveis de ambiente

## Regras de Desenvolvimento
- **Linguagem**: Fale sempre em português do Brasil.
- **Orquestração**: Use sempre o framework `using-superpowers`.
- **Brainstorming**: Obrigatório iniciar qualquer nova funcionalidade ou correção complexa pela skill de `brainstorming`.
- **Segurança**: Whitelist de User ID do Telegram é obrigatória. Nunca exponha chaves no código.
- **Estrutura**: Arquitetura modular e clara. Sem servidor web (use long polling).
- **Banco de Dados**: Pergunte sempre ao usuário qual banco de dados utilizar para novas implementações de backend (além do persistente já definido).

## Comandos Úteis
- `npm install`: Instala dependências.
- `npm run dev`: Inicia o bot em modo de desenvolvimento.
- `npm run build`: Compila o projeto.
- `npm start`: Inicia o bot em produção.
