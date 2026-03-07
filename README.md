# OpenGravity Bot 🦾

OpenGravity é um assistente de IA pessoal rodando 24/7 no Telegram, projetado para ser seu segundo cérebro. Ele utiliza modelos de linguagem de ponta via **Groq Cloud** e possui memória persistente em tempo real através do **Firebase Firestore**.

---

## 🌟 Principais Funcionalidades

- **Memória Infinita:** Contexto de conversas salvo na nuvem.
- **IA de Alta Performance:** Integrado com modelos Llama/Mixtral via Groq API.
- **Disponibilidade Global:** Operando 24/7 em VPS Linux dedicada.
- **Deploy Automático:** Pipeline CI/CD integrado via GitHub Actions.

---

## 🛠️ Tecnologias Utilizadas

- **Runtime:** Node.js (v20+)
- **Linguagem:** TypeScript
- **Framework Bot:** grammY
- **IA:** Groq SDK
- **Banco de Dados:** Firebase Admin SDK (Cloud Firestore)
- **Processos:** PM2
- **Infraestrutura:** VPS Linux (Ubuntu) + GitHub Actions

---

## 🚀 Começo Rápido (Local)

### 1. Clonar e Instalar
```bash
git clone https://github.com/analistasistemas-bit/opengravity.git
cd opengravity
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz:
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
GROQ_API_KEY=sua_chave_aqui
# Outras configurações variam conforme ambiente
```

### 3. Executar em Desenvolvimento
```bash
npm run dev
```

---

## 🌐 Deploy e Produção

O projeto foi configurado para rodar em uma VPS protegida. Para detalhes completos sobre comandos técnicos, configuração de firewall, chaves SSH e PM2, consulte nossa documentação dedicada:

👉 **[Guia de Deploy VPS](./docs/vps-setup-guide.md)**

---

## 🤖 Automação CI/CD

Este repositório está configurado com **GitHub Actions**. 
- Qualquer alteração na branch `main` dispara um deploy automático para a VPS.
- O processo é gerenciado pelo workflow em `.github/workflows/deploy.yml`.

---

## 📄 Licença

Este projeto é para uso pessoal e desenvolvimento de inteligência artificial.

---
*OpenGravity - Elevando sua produtividade com IA.* 🚀
