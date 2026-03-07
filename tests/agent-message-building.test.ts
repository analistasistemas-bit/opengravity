import test from 'node:test';
import assert from 'node:assert/strict';

import { buildModelMessages, SYSTEM_PROMPT } from '../src/agent/agent.js';

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
