# Design de Deploy: OpenGravity na VPS (24/7)

Este documento descreve a arquitetura e o processo para hospedar o bot OpenGravity em uma VPS, garantindo disponibilidade ininterrupta.

## 1. Arquitetura de Deploy

A aplicação será rodada em modo **Production** utilizando o Node.js. Para garantir que o bot reinicie automaticamente em caso de falhas ou se a VPS for reiniciada, utilizaremos o **PM2** (Process Manager 2).

- **Linguagem:** Node.js (v18+)
- **Process Manager:** PM2
- **Gerenciamento de Código:** Git (via terminal na VPS)
- **Persistência de Dados:** Firebase Firestore (Nuvem)

## 2. Fluxo de Instalação

O processo será dividido em 3 fases principais:

### Fase A: Preparação do Ambiente
1. Instalação do Node.js e NPM na VPS.
2. Instalação global do PM2.
3. Clonagem do repositório ou transferência de arquivos.

### Fase B: Configuração da Aplicação
1. Instalação de dependências (`npm install --production`).
2. Configuração das variáveis de ambiente (`.env`).
3. Upload do arquivo de credenciais do Firebase (`service-account.json`).
4. Build do projeto TypeScript para JavaScript (`npm run build`).

### Fase C: Inicialização e Monitoramento
1. Iniciar o processo com `pm2 start dist/index.js`.
2. Habilitar o PM2 para iniciar no boot do sistema.

## 3. Segurança e Manutenção

- **Segredos:** O arquivo `.env` e o `service-account.json` devem ser mantidos fora do controle de versão e configurados manualmente na VPS.
- **Logs:** Monitoramento contínuo através do comando `pm2 logs`.
- **Atualizações:** Para atualizar o bot, bastará fazer um `git pull`, `npm run build` e `pm2 restart`.

## 4. Plano de Recuperação

- O PM2 monitorará o processo e o reiniciará instantaneamente em caso de erro fatal.
- O Firestore garante que, se o bot cair e voltar, o histórico das conversas será mantido intacto.
