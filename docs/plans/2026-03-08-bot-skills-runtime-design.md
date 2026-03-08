# Bot Skills Runtime Design

## Goal

Transform the installed local skills into actual Telegram bot capabilities in two modes:
- consultive mode: the bot uses local skill guidance to answer and recommend workflows
- action mode: the bot asks what the user wants to do and executes supported actions on uploaded files

## Approach

The bot will keep the current deterministic planner, but gain a runtime capability layer on top:

1. A local skill catalog maps installed skills to user-facing capabilities and suggested actions.
2. A document workflow stores the most recent uploaded file per user and asks a follow-up question such as "Quer resumir, extrair texto ou listar abas?".
3. A document execution service performs real actions for supported file types.
4. The agent continues to use local skills as prompt guidance for consultive mode, especially for web testing, branding, frontend design, and other non-file domains.

## Supported First-Class Action Domains

- `pdf`: extract text and summarize
- `docx`: extract text and summarize
- `xlsx`: list sheets and summarize workbook contents
- `pptx`: extract slide text and summarize
- text-like files (`txt`, `md`, `json`, `csv`): read and summarize

## Why This Design

This avoids pretending the Anthropic skill folders are executable plugins. Instead, the bot turns those skills into:
- reference knowledge for the LLM
- explicit Telegram workflows for real tasks

That keeps the bot predictable, testable, and extensible.

## User Experience

Examples:

- User uploads `relatorio.pdf`
  - Bot: "Recebi `relatorio.pdf`. Quer que eu extraia o texto ou faça um resumo?"

- User uploads `vendas.xlsx`
  - Bot: "Recebi `vendas.xlsx`. Quer listar abas, resumir a planilha ou extrair texto tabular?"

- User asks about Playwright or frontend design
  - Bot uses local skill guidance to answer and propose next steps

## Error Handling

- If extraction fails, the bot must say the action failed instead of inventing empty results.
- If a file type is unsupported, the bot must state that clearly and fall back to consultive guidance.
- Pending document actions are per-user and short-lived to avoid cross-talk between different chats.

## Testing

- unit tests for skill catalog matching
- unit tests for document action parsing
- unit tests for extraction adapters with small fixtures or mocked outputs
- build verification before commit
