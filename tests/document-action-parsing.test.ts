import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDocumentActionReply } from '../src/agent/document_service.js';

test('parseDocumentActionReply detects summarize intent', () => {
    assert.equal(parseDocumentActionReply('resuma esse arquivo'), 'summarize');
});

test('parseDocumentActionReply detects sheet listing intent', () => {
    assert.equal(parseDocumentActionReply('liste as abas da planilha'), 'list_sheets');
});

test('parseDocumentActionReply returns null for unrelated text', () => {
    assert.equal(parseDocumentActionReply('oi, tudo bem?'), null);
});
