import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildModelMessages,
    parsePlannerResponse,
    SYSTEM_PROMPT,
} from '../src/agent/agent.js';

test('SYSTEM_PROMPT explicitly requires valid tools API calls', () => {
    assert.match(SYSTEM_PROMPT, /JSON estrito/i);
    assert.match(SYSTEM_PROMPT, /pseudo-XML/i);
});

test('buildModelMessages keeps conversational history and excludes old tool traces', () => {
    const messages = buildModelMessages([
        { user_id: 1, role: 'user', content: 'Quais emails recebi hoje?' },
        { user_id: 1, role: 'assistant', content: '', tool_calls: [{ id: 'call_1' }] },
        { user_id: 1, role: 'tool', content: '{"count":1}', tool_call_id: 'call_1', name: 'gmail_search' },
        { user_id: 1, role: 'assistant', content: 'Voce recebeu 1 email hoje.' },
    ]);

    assert.deepEqual(messages, [
        { role: 'user', content: 'Quais emails recebi hoje?' },
        { role: 'assistant', content: 'Voce recebeu 1 email hoje.' },
    ]);
});

test('parsePlannerResponse extracts a tool execution plan from JSON content', () => {
    const parsed = parsePlannerResponse('{"action":"tool","toolName":"gmail_search","arguments":{"query":"in:inbox newer:1d","limit":"10"}}');

    assert.deepEqual(parsed, {
        action: 'tool',
        toolName: 'gmail_search',
        arguments: {
            query: 'in:inbox newer:1d',
            limit: 10,
        },
    });
});

test('parsePlannerResponse extracts a direct response plan', () => {
    const parsed = parsePlannerResponse('{"action":"respond","response":"Oi! Como posso ajudar?"}');

    assert.deepEqual(parsed, {
        action: 'respond',
        response: 'Oi! Como posso ajudar?',
    });
});

test('parsePlannerResponse rejects non-json payloads', () => {
    const parsed = parsePlannerResponse('Oi! Vou verificar novamente!');
    assert.equal(parsed, null);
});
