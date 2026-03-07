# Guia Técnico de Deploy VPS - OpenGravity Bot 🚀

Este guia detalha todo o processo técnico realizado para configurar, proteger e automatizar o bot OpenGravity em uma VPS Linux (Ubuntu 20.04+).

---

## 1. Arquitetura do Sistema

O bot opera no seguinte fluxo:
**Telegram User** ↔️ **Bot (Node.js na VPS)** ↔️ **Groq Cloud (IA)** & **Firebase Firestore (Memória)**

---

## 2. Preparação do Servidor (Dependencies)

Primeiro, instalamos o ambiente necessário para rodar aplicações Node.js modernas.

```bash
# Atualizar lista de pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Node.js v20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar gerenciador de processos global
sudo npm install -g pm2
```

---

## 3. Segurança e Hardening (Usuário Dedicado)

Para segurança, o bot NÃO roda como `root`. Criamos um usuário isolado.

```bash
# Criar usuário sem privilégios de root
sudo adduser opengravity

# Dar permissão para o usuário ler o diretório (se necessário)
sudo chown -R opengravity:opengravity /home/opengravity/
```

---

## 4. Setup da Aplicação

O código é clonado do GitHub e configurado para produção.

```bash
# Como usuário opengravity:
cd ~
git clone https://github.com/analistasistemas-bit/opengravity.git
cd opengravity

# Instalar dependências de produção e build
npm install

# Compilar TypeScript para JavaScript
npm run build
```

### Configuração de Segredos (Manual)
Os arquivos sensíveis **não** vão para o Git. Eles foram criados manualmente na VPS:
- `.env`: Contém `TELEGRAM_TOKEN`, `GROQ_API_KEY`, etc.
- `service-account.json`: Chave de acesso ao Firebase Admin SDK.

---

## 5. Gerenciamento de Processo (PM2)

Utilizamos o **PM2** para garantir que o bot reinicie sozinho se falhar ou se o servidor for reiniciado.

Usamos um arquivo de configuração (`ecosystem.config.cjs`):
```javascript
module.exports = {
  apps: [{
    name: "opengravity-bot",
    script: "./dist/index.js",
    env: { NODE_ENV: "production" }
  }]
};
```

**Comandos principais:**
```bash
# Iniciar o bot
pm2 start ecosystem.config.cjs

# Ver logs em tempo real
pm2 logs opengravity-bot

# Ver status
pm2 list

# Salvar lista para iniciar no boot do sistema
pm2 save
pm2 startup
```

---

## 6. Automação CI/CD (GitHub Actions)

Configuramos o deploy automático: toda vez que você faz `git push origin main`, a VPS atualiza sozinha.

### Passo a Passo da Configuração:
1. **Chaves SSH:** Geramos uma chave SSH na VPS para o GitHub.
   `ssh-keygen -t ed25519 -C "github-actions"`
2. **Deploy Key:** Adicionamos a chave pública no GitHub (Settings -> Deploy Keys).
3. **Secrets:** Adicionamos os segredos no GitHub (Settings -> Secrets -> Actions):
   - `SSH_HOST`: IP da VPS.
   - `SSH_USER`: `opengravity`.
   - `SSH_PRIVATE_KEY`: Conteúdo da chave privada gerada.

### O Workflow (`.github/workflows/deploy.yml`):
Ele executa:
1. `git pull origin main`
2. `npm install`
3. `npm run build`
4. `pm2 reload opengravity-bot`

---

## 7. Comandos de Manutenção Rápidos

| Objetivo | Comando |
| :--- | :--- |
| Ver se o bot está vivo | `pm2 status` |
| Ver últimas mensagens de erro | `pm2 logs opengravity-bot --lines 50` |
| Reiniciar manualmente | `pm2 restart opengravity-bot` |
| Parar o bot | `pm2 stop opengravity-bot` |

---
*Documentação gerada em 07/03/2026.*
