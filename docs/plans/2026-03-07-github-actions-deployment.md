# GitHub Actions Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configurar o deploy automático do OpenGravity na VPS via GitHub Actions sempre que houver um push na branch `main`.

**Architecture:** O GitHub Actions se conecta à VPS via SSH usando segredos configurados no repositório, executa o pull do código, reconstrói o projeto e reinicia o serviço via PM2.

**Tech Stack:** GitHub Actions, SSH, PM2, Git.

---

### Task 1: Gerar Chaves SSH na VPS

**Goal:** Criar um par de chaves SSH exclusivo para a automação no usuário `opengravity`.

**Step 1: Gerar a chave na VPS (Comando para o Usuário)**
Solicitar ao usuário que execute na VPS (como usuário `opengravity`):
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/id_github_actions -N ""
```

**Step 2: Adicionar a chave pública ao arquivo authorized_keys**
Executar na VPS:
```bash
cat ~/.ssh/id_github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh/
```

**Step 3: Exibir chaves para o usuário copiar**
Comandos para o usuário coletar os dados:
- Chave Pública: `cat ~/.ssh/id_github_actions.pub` (Para Deploy Keys)
- Chave Privada: `cat ~/.ssh/id_github_actions` (Para Secrets)

---

### Task 2: Configurar Repositório no GitHub

**Goal:** Adicionar as chaves e segredos necessários no painel do GitHub.

**Step 1: Adicionar Deploy Key**
Orientar o usuário a ir em `Settings -> Deploy Keys -> Add deploy key`:
- Title: `VPS_DEPLOY_KEY`
- Key: (Colar conteúdo da chave pública)
- Allow write access: [ ] (Não necessário)

**Step 2: Adicionar Secrets de Actions**
Orientar o usuário a ir em `Settings -> Secrets and variables -> Actions -> New repository secret`:
- `SSH_PRIVATE_KEY`: (Colar conteúdo da chave privada)
- `SSH_HOST`: (IP da sua VPS)
- `SSH_USER`: `opengravity`

---

### Task 3: Criar Workflow do GitHub Actions

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Criar o arquivo de workflow**
```yaml
name: Deploy OpenGravity to VPS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/opengravity
            git pull origin main
            npm install
            npm run build
            pm2 reload opengravity-bot --update-env
```

**Step 2: Commit e Push**
```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add github actions deploy workflow"
git push origin main
```

---

### Task 4: Verificação Final

**Step 1: Monitorar aba Actions no GitHub**
Verificar se o workflow "Deploy OpenGravity to VPS" inicia e completa com sucesso.

**Step 2: Verificar logs na VPS**
Executar na VPS:
```bash
pm2 logs opengravity-bot --lines 20
```
