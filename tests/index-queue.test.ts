import test from 'node:test';
import assert from 'node:assert/strict';

import { createPerUserSerialExecutor } from '../src/lib/per_user_queue.js';

test('createPerUserSerialExecutor runs tasks sequentially for the same user', async () => {
    const runSerial = createPerUserSerialExecutor<number>();
    const events: string[] = [];

    const first = runSerial('627934997', async () => {
        events.push('first:start');
        await new Promise((resolve) => setTimeout(resolve, 20));
        events.push('first:end');
        return 1;
    });

    const second = runSerial('627934997', async () => {
        events.push('second:start');
        events.push('second:end');
        return 2;
    });

    const results = await Promise.all([first, second]);

    assert.deepEqual(results, [1, 2]);
    assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);
});

test('createPerUserSerialExecutor does not serialize different users together', async () => {
    const runSerial = createPerUserSerialExecutor<void>();
    const events: string[] = [];

    await Promise.all([
        runSerial('user-a', async () => {
            events.push('a:start');
            await new Promise((resolve) => setTimeout(resolve, 10));
            events.push('a:end');
        }),
        runSerial('user-b', async () => {
            events.push('b:start');
            events.push('b:end');
        }),
    ]);

    assert.equal(events.includes('a:start'), true);
    assert.equal(events.includes('b:start'), true);
});
