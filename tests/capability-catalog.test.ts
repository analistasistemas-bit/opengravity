import test from 'node:test';
import assert from 'node:assert/strict';

import { getDocumentCapability } from '../src/agent/capability_catalog.js';

test('getDocumentCapability returns actions for xlsx files', () => {
    const capability = getDocumentCapability('vendas.xlsx');

    assert.equal(capability?.kind, 'xlsx');
    assert.deepEqual(capability?.actions.map((action) => action.id), [
        'summarize',
        'list_sheets',
        'extract_text',
    ]);
});

test('getDocumentCapability returns null for unsupported files', () => {
    assert.equal(getDocumentCapability('arquivo.exe'), null);
});
