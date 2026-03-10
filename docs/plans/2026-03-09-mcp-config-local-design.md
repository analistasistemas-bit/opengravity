# Design: Configuração MCP por Projeto (OpenGravity)

Este documento descreve a solução para isolar as configurações de MCP para o projeto OpenGravity, permitindo contornar o limite global de ferramentas.

## Abordagem Selecionada
**Substituição Total**: O Antigravity prioriza o arquivo de configuração localizado no diretório do projeto sobre o arquivo global.

## Especificações Técnicas

### 1. Estrutura de Arquivos
- **Caminho**: `/Users/diego/Desktop/IA/opengravity/.gemini/antigravity/mcp_config.json`

### 2. Conteúdo do MCP Config
O arquivo conterá apenas os servidores necessários para o desenvolvimento do OpenGravity:
- **Supabase**: Gerenciamento de banco de dados e migrações.
- **Firebase**: Essencial para a memória persistente do bot.
- **Render/Upstash**: Opcionais para deploy e cache.

## Plano de Verificação
1. Verificar a criação do arquivo no diretório correto.
2. Confirmar se o Antigravity carrega apenas os servidores definidos no arquivo local ao interagir com o projeto.
