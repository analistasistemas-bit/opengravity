import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildGogExecOptions,
    buildGogShellCommand,
    normalizeGmailSearchResult,
    sanitizeGmailQuery,
} from '../src/tools/google_workspace.js';

test('buildGogShellCommand injects the default account when GOG_ACCOUNT is set', () => {
    const command = buildGogShellCommand('gmail search "newer_than:1d" --limit 1', {
        GOG_ACCOUNT: 'analistasistemas@gmail.com',
    });

    assert.equal(
        command,
        'gog gmail search "newer_than:1d" --limit 1 --account "analistasistemas@gmail.com" --json --no-input'
    );
});

test('buildGogShellCommand uses explicit GOG_BIN when provided', () => {
    const command = buildGogShellCommand('gmail search "newer_than:1d"', {
        GOG_BIN: '/home/opengravity/bin/gog',
    });

    assert.equal(
        command,
        '/home/opengravity/bin/gog gmail search "newer_than:1d" --json --no-input'
    );
});

test('buildGogShellCommand does not duplicate account when command already sets one', () => {
    const command = buildGogShellCommand('gmail search "newer_than:1d" --account "other@gmail.com"', {
        GOG_ACCOUNT: 'analistasistemas@gmail.com',
    });

    assert.equal(
        command,
        'gog gmail search "newer_than:1d" --account "other@gmail.com" --json --no-input'
    );
});

test('buildGogExecOptions preserves gog environment variables and prepends a user bin directory', () => {
    const options = buildGogExecOptions({
        HOME: '/home/opengravity',
        PATH: '/usr/local/bin:/usr/bin',
        GOG_ACCOUNT: 'analistasistemas@gmail.com',
        GOG_KEYRING_BACKEND: 'file',
        GOG_KEYRING_PASSWORD: 'secret',
    });

    assert.equal(options.env.GOG_ACCOUNT, 'analistasistemas@gmail.com');
    assert.equal(options.env.GOG_KEYRING_BACKEND, 'file');
    assert.equal(options.env.GOG_KEYRING_PASSWORD, 'secret');
    assert.equal(options.env.PATH, '/home/opengravity/bin:/usr/local/bin:/usr/bin');
});

test('normalizeGmailSearchResult keeps only the email fields the assistant should expose', () => {
    const normalized = normalizeGmailSearchResult([
        {
            id: 'abc123',
            from: 'Discord <noreply@discord.com>',
            subject: 'Você foi mencionado',
            date: '2026-03-07 10:06',
            snippet: 'trecho que nao deve ser priorizado',
            labels: ['INBOX', 'UNREAD'],
        },
    ]);

    assert.deepEqual(normalized, {
        count: 1,
        emails: [
            {
                id: 'abc123',
                from: 'Discord <noreply@discord.com>',
                subject: 'Você foi mencionado',
                date: '2026-03-07 10:06',
            },
        ],
    });
});

test('normalizeGmailSearchResult keeps entries even when source uses fromName/fromEmail aliases', () => {
    const normalized = normalizeGmailSearchResult({
        items: [
            {
                messageId: 'm1',
                fromName: 'GitHub',
                fromEmail: 'noreply@github.com',
                title: '[GitHub] Alert',
                receivedAt: '2026-03-07T10:06:00Z',
            },
        ],
    });

    assert.deepEqual(normalized, {
        count: 1,
        emails: [
            {
                id: 'm1',
                from: 'GitHub <noreply@github.com>',
                subject: '[GitHub] Alert',
                date: '2026-03-07T10:06:00Z',
            },
        ],
    });
});

test('sanitizeGmailQuery rewrites invalid from:YYYY-MM-DD into date range', () => {
    assert.equal(
        sanitizeGmailQuery('in:inbox is:unread from:2026-03-07'),
        'in:inbox is:unread after:2026/03/07 before:2026/03/08'
    );
});
