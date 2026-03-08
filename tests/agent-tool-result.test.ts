import test from 'node:test';
import assert from 'node:assert/strict';

import { formatDirectToolResponse, formatToolResultContent } from '../src/agent/agent.js';

test('formatToolResultContent serializes tool output as readable JSON', () => {
    const content = formatToolResultContent({
        count: 1,
        emails: [
            {
                from: 'Discord <noreply@discord.com>',
                subject: 'Você foi mencionado',
                date: '2026-03-07 10:06',
            },
        ],
    });

    assert.match(content, /"emails"/);
    assert.match(content, /Discord <noreply@discord.com>/);
    assert.doesNotMatch(content, /\[object Object\]/);
});

test('formatDirectToolResponse renders list_skills deterministically', () => {
    const response = formatDirectToolResponse('list_skills', [
        {
            slug: 'pdf',
            name: 'pdf',
            description: 'Process PDF files',
            guidance: 'Extract text from PDFs.',
            skillPath: '/tmp/pdf',
            examples: ['como extrair texto de um pdf?', 'o que posso fazer com esse arquivo pdf?'],
        },
    ]);

    assert.match(response || '', /Skills disponíveis/i);
    assert.match(response || '', /pdf: Process PDF files/);
    assert.match(response || '', /como extrair texto de um pdf/i);
});

test('formatDirectToolResponse renders describe_skill deterministically', () => {
    const response = formatDirectToolResponse('describe_skill', {
        slug: 'pdf',
        name: 'pdf',
        description: 'Process PDF files',
        guidance: 'Extract text from PDFs.',
        skillPath: '/tmp/pdf',
        examples: ['como extrair texto de um pdf?', 'o que posso fazer com esse arquivo pdf?'],
    });

    assert.match(response || '', /Skill: pdf/);
    assert.match(response || '', /Process PDF files/);
    assert.match(response || '', /Exemplos:/);
});
