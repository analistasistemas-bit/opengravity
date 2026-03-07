import test from 'node:test';
import assert from 'node:assert/strict';

import { formatToolResultContent } from '../src/agent/agent.js';

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
