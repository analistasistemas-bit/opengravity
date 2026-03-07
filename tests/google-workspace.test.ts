import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGogExecOptions, buildGogShellCommand } from '../src/tools/google_workspace.js';

test('buildGogShellCommand injects the default account when GOG_ACCOUNT is set', () => {
    const command = buildGogShellCommand('gmail search "newer_than:1d" --limit 1', {
        GOG_ACCOUNT: 'analistasistemas@gmail.com',
    });

    assert.equal(
        command,
        'gog gmail search "newer_than:1d" --limit 1 --account "analistasistemas@gmail.com" --json --no-input'
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
