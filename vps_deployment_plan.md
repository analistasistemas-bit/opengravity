# Plano de Implementação: Deploy OpenGravity na VPS

Este plano detalha os comandos e configurações necessários para colocar o bot em produção na sua VPS.

## User Review Required

> [!IMPORTANT]
> - Você precisará ter acesso SSH à sua VPS.
> - O arquivo [service-account.json](file:///Users/diego/Desktop/IA/opengravity/service-account.json) e o [.env](file:///Users/diego/Desktop/IA/opengravity/.env) não devem ser enviados para o Git; eles serão criados manualmente na VPS para segurança.
> - Verifique se a porta de saída para o Firebase (HTTPS/443) e para a API do Telegram está liberada no seu firewall (geralmente já está).

## Passos Propostos

### 1. Preparação (Local)
Certifique-se de que a última versão do código está estável.
- [ ] Commitar alterações recentes (se houver).
- [ ] Push para seu repositório Git (ou preparar transferência via SCP/FTP).

### 2. Configuração na VPS (SSH)

#### [ACTION] Instalação de Pré-requisitos
```bash
# Atualizar repositórios
sudo apt update

# Instalar Node.js (v18 ou v20 recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar o Gerenciador de Processos PM2
sudo npm install -g pm2
```

### 3. Transferência do Código para a VPS

Como o repositório é **privado**, o GitHub não aceita sua senha normal no prompt. Você tem duas opções principais para resolver isso:

#### Opção A: Chave SSH (Recomendado e Seguro)
Este método evita que você digite usuário e senha no futuro.

1.  **Gere uma chave na VPS:**
    ```bash
    ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
    ```
    *(Aperte Enter em tudo para manter o padrão)*
2.  **Copie a chave gerada:**
    ```bash
    cat ~/.ssh/id_ed25519.pub
    ```
3.  **Adicione ao GitHub:** Vá em [GitHub SSH Settings](https://github.com/settings/keys) -> Clique em "New SSH Key" -> Cole o conteúdo que você copiou.
4.  **Clone usando SSH:**
    ```bash
    git clone git@github.com:analistasistemas-bit/opengravity.git
    ```

#### Opção B: Personal Access Token (PAT)
Se quiser apenas resolver o prompt atual rapidamente:

1.  **Crie o Token:** Vá em [GitHub Token Settings](https://github.com/settings/tokens) -> "Generate new token (classic)".
2.  **Permissões:** Marque a caixa `repo`.
3.  **No prompt da VPS:**
    - **Username:** Seu nome de usuário do GitHub.
    - **Password:** Cole o **Token** que você gerou (ele funciona como a senha).

---

### 3. Configuração na VPS (SSH)

#### [ACTION] Preparar a Pasta e Dependências
Execute estes comandos dentro da pasta `opengravity` na VPS:
```bash
# Entrar na pasta
cd opengravity

# Instalar dependências (incluindo as de build)
npm install

# Compilar TypeScript para JavaScript
npm run build
```

#### [ACTION] Configuração de Segredos
Agora você deve criar os arquivos que guardam suas chaves secretas:

1. **Arquivo .env:**
   `nano .env`
   (Cole aqui o conteúdo do seu [.env](file:///Users/diego/Desktop/IA/opengravity/.env) local e salve com Ctrl+O, Enter, Ctrl+X)

2. **Arquivo service-account.json:**
   `nano service-account.json`
   (Cole aqui o conteúdo do seu [service-account.json](file:///Users/diego/Desktop/IA/opengravity/service-account.json) e salve)

#### [ACTION] Inicialização com PM2
```bash
# Iniciar o bot como um processo de fundo
pm2 start dist/index.js --name "opengravity-bot"

# Garantir que ele inicie no boot da máquina
pm2 save
pm2 startup
# (Siga as instruções que o comando acima mostrar na tela)
```

## Plano de Verificação

### Verificação de Status
- Executar `pm2 status` para ver se o processo está "online".
- Executar `pm2 logs opengravity-bot` para ver se o bot conectou ao Firestore e ao Telegram.

### Teste de Vida Real
- Enviar uma mensagem para o bot no Telegram e aguardar a resposta.
