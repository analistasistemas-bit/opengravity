---
name: pdf
description: Processa e analisa arquivos PDF — extrai texto, resume conteúdo e responde perguntas sobre o documento.
---

# Skill: PDF

Use esta skill quando o usuário enviar um arquivo `.pdf` ou mencionar que tem um PDF para analisar.

## Quando usar

- Usuário envia um arquivo PDF diretamente no chat
- Usuário pergunta sobre conteúdo de um PDF
- Usuário quer resumir, extrair texto ou analisar um relatório, contrato ou documento PDF

## Como funciona

Ao receber um PDF no Telegram, o bot baixa o arquivo e oferece as seguintes ações:
1. **Resumir** — Gera um resumo objetivo com pontos principais
2. **Extrair texto** — Retorna o texto bruto do PDF

## Orientação para o usuário

Se o usuário mencionar um PDF mas não enviou ainda, diga:
> "Pode enviar o arquivo PDF diretamente aqui no chat e eu processo para você!"

## Exemplos de uso

- "Tenho um contrato em PDF, pode resumir?"
- "Extrai o texto desse PDF pra mim"
- "O que diz esse documento?"
