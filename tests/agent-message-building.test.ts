import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildModelMessages,
    parseToolCallFromText,
    SYSTEM_PROMPT,
} from '../src/agent/agent.js';

test('SYSTEM_PROMPT explicitly requires valid tools API calls', () => {
    assert.match(SYSTEM_PROMPT, /tools API/i);
    assert.match(SYSTEM_PROMPT, /Nunca escreva <function=/i);
});

test('buildModelMessages keeps conversational history and excludes old tool traces', () => {
    const messages = buildModelMessages([
        { user_id: 1, role: 'user', content: 'Quais emails recebi hoje?' },
        { user_id: 1, role: 'assistant', content: '', tool_calls: [{ id: 'call_1' }] },
        { user_id: 1, role: 'tool', content: '{"count":1}', tool_call_id: 'call_1', name: 'gmail_search' },
        { user_id: 1, role: 'assistant', content: 'Voce recebeu 1 email hoje.' },
    ]);

    assert.deepEqual(messages, [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Quais emails recebi hoje?' },
        { role: 'assistant', content: 'Voce recebeu 1 email hoje.' },
    ]);
});

test('parseToolCallFromText extracts a function call from JSON content', () => {
    const parsed = parseToolCallFromText('{"type":"function","name":"gmail_search","parameters":{"query":"in:inbox newer:1d","limit":10}}');

    assert.deepEqual(parsed, {
        name: 'gmail_search',
        arguments: {
            query: 'in:inbox newer:1d',
            limit: 10,
        },
    });
});

test('parseToolCallFromText extracts a function call from pseudo-xml content', () => {
    const parsed = parseToolCallFromText(`<function=drive_search={"query":"modifiedTime >= '2026-03-01'"}</function>`);

    assert.deepEqual(parsed, {
        name: 'drive_search',
        arguments: {
            query: "modifiedTime >= '2026-03-01'",
        },
    });
});

test('parseToolCallFromText extracts a function call from pseudo-xml body format and coerces numeric limit', () => {
    const parsed = parseToolCallFromText(`<function=gmail_search>{"query":"in:inbox newer:1d","limit":"10"}</function>`);

    assert.deepEqual(parsed, {
        name: 'gmail_search',
        arguments: {
            query: 'in:inbox newer:1d',
            limit: 10,
        },
    });
});
