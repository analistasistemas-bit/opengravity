# Guia: Gerando o `client_secret.json` do Google Workspace

Siga estes passos no seu console do Google Cloud ([console.cloud.google.com](https://console.cloud.google.com/welcome?project=opengravity-e7732)) conforme sua imagem:

### 1. Ativar as APIs Necessárias
1. No menu lateral (hambúrguer ☰), vá em **APIs e serviços** > **Biblioteca**.
2. Pesquise e ative, uma por uma, as seguintes APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Drive API**
   - **Google Sheets API**
   - **Google Docs API**

### 2. Configurar o Google Auth Platform (Antiga Tela de Consentimento)
1. Na tela que você está vendo, clique no botão azul **"Vamos começar"**.
2. No passo **Informações do app**:
   - **Nome do app**: OpenGravity
   - **E-mail de suporte**: Escolha o seu e-mail.
   - **Logotipo**: Pode deixar em branco.
   - **Informações de contato do desenvolvedor**: Coloque seu e-mail novamente.
   - Clique em **Salvar e continuar**.
3. No passo **Público-alvo**:
   - Selecione **Externo**.
   - Em **Usuários de teste**, clique em **+ Add Users** e adicione o seu e-mail. **(Muito importante!)**
   - Clique em **Salvar e continuar**.
4. No passo **Escopos** (Acesso a dados):
   - Você pode pular isso por enquanto ou clicar em "Adicionar escopos" e selecionar os das APIs que ativamos (Gmail, Calendar, etc).
   - Clique em **Salvar e continuar**.
5. Clique em **Voltar para o painel** ao final.

### 3. Criar o Cliente OAuth
1. Na tela que você está, clique no botão cinza à direita: **"Criar um cliente OAuth"**.
2. Em **Tipo de aplicativo**, selecione **App de computador** (Desktop App).
3. No campo **Nome**, coloque: `OpenGravity CLI`.
4. Clique no botão azul **Criar** no final da página.

### 4. Baixar o arquivo
1. Na lista de "IDs de cliente OAuth 2.0", você verá o que acabou de criar.
2. Clique no ícone de **Download** (seta para baixo ⬇️) ao lado do nome.
3. Clique em **Download JSON**.
4. Renomeie o arquivo baixado para `client_secret.json` e me envie o caminho dele ou o conteúdo do arquivo.

---
> [!TIP]
> Salve este arquivo na pasta raiz do projeto (`/Users/diego/Desktop/IA/opengravity/`) para facilitar minha vida!
