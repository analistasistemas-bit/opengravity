# Guia de Configuração Local - OpenGravity 💻

Este guia detalha como preparar seu ambiente de desenvolvimento local para rodar e testar o OpenGravity antes de enviar para a VPS.

---

## 1. Pré-requisitos

Antes de começar, instale as seguintes ferramentas em sua máquina:

- **Node.js (versão 20 ou superior):** [Baixar aqui](https://nodejs.org/).
- **Git:** Para clonar o repositório.
- **VS Code:** (Recomendado) Com a extensão "ESLint" e "Prettier".

---

## 2. Instalação do Projeto

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/analistasistemas-bit/opengravity.git
    cd opengravity
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

---

## 3. Configuração de Credenciais (.env)

O bot precisa de 3 conexões principais para funcionar. Crie um arquivo chamado `.env` na raiz do projeto e preencha conforme abaixo:

```env
# TOKEN do Bot no Telegram (Obtido com @BotFather)
TELEGRAM_BOT_TOKEN=seu_token_aqui

# Chave API da Groq Cloud (Obtida em console.groq.com)
GROQ_API_KEY=sua_chave_aqui

# Ambiente (opcional)
NODE_ENV=development
```

---

## 4. Conexão com Firebase (Memória Cloud)

Para que o bot salve as conversas, você precisa da chave do Firebase:

1.  Vá ao **Console do Firebase** -> Configurações do Projeto -> Contas de Serviço.
2.  Clique em **"Gerar nova chave privada"**.
3.  Salve o arquivo JSON na raiz do projeto com o nome: `service-account.json`.

> [!WARNING]
> Nunca compartilhe ou suba o arquivo `service-account.json` para o GitHub! Ele já está no `.gitignore`.

---

## 5. Comandos de Desenvolvimento

No seu terminal local, você usará principalmente estes comandos:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o bot com "watch mode" (reinicia a cada alteração no código). |
| `npm run build` | Valida o TypeScript e gera os arquivos JavaScript na pasta `/dist`. |
| `npm run start` | Roda a versão compilada (simulando produção). |

---

## 6. Estrutura de Pastas

-   `src/index.ts`: Ponto de entrada do bot.
-   `src/tools/`: Ferramentas que o bot pode usar (ex: `get_current_time`).
-   `service-account.json`: Credencial do banco de dados (não versionada).
-   `ecosystem.config.cjs`: Configuração para o PM2 (usado na VPS).

---

## 7. Dicas de Desenvolvimento

-   **Logs:** O bot imprime no console cada interação. Verifique erros de API da Groq ou do Telegram diretamente no terminal onde o `npm run dev` está rodando.
-   **TypeScript:** Se o VS Code mostrar erros vermelhos sob o código, verifique se você rodou o `npm install`.

---
*OpenGravity Local Setup Guide - Atualizado em 07/03/2026*
