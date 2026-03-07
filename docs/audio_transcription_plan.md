# Plano de Implementação: Transcrição de Áudio com Groq Whisper

Este plano detalha a adição de suporte para mensagens de voz no OpenGravity, utilizando a API de transcrição da Groq (Whisper).

## User Review Required

> [!IMPORTANT]
> - O bot agora poderá receber e baixar arquivos de áudio do Telegram.
> - Utilizaremos o modelo `whisper-large-v3` da Groq para transcrição.
> - Arquivos temporários serão baixados para a pasta `/tmp` e excluídos após o processamento.

## Mudanças Propostas

---

### [Componente] Central de Configuração
#### [MODIFY] [config.ts](file:///Users/diego/Desktop/IA/opengravity/src/config.ts)
- Adicionar variável `GROQ_AUDIO_MODEL` com valor padrão `whisper-large-v3`.

---

### [Componente] Serviço de Áudio
#### [NEW] [audio_service.ts](file:///Users/diego/Desktop/IA/opengravity/src/agent/audio_service.ts)
- Criar classe `AudioService` para gerenciar:
    - Download do áudio do Telegram.
    - Envio para a API de Transcrições da Groq.
    - Limpeza de arquivos temporários.

---

### [Componente] Ponto de Entrada (Bot)
#### [MODIFY] [index.ts](file:///Users/diego/Desktop/IA/opengravity/src/index.ts)
- Adicionar handler para `bot.on('message:voice')`.
- Integrar com `AudioService` para obter o texto e passar para o `agent.handleMessage`.

---

## Plano de Verificação

### Testes Manuais
1.  **Enviar um áudio curto:** Verificar se o bot responde "Transcrevendo..." e depois processa o texto.
2.  **Enviar um áudio longo:** Validar se a transcrição lida bem com durações maiores.
3.  **Verificar limpeza:** Confirmar se os arquivos no `/tmp` foram removidos após o sucesso/erro.

### Automated Tests
- Não aplicável no momento (necessita de integração real com Telegram/Groq).
