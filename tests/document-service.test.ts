import test from 'node:test';
import assert from 'node:assert/strict';

import { detectDocumentKind } from '../src/agent/document_service.js';

test('detectDocumentKind recognizes supported document types', () => {
    assert.equal(detectDocumentKind('arquivo.pdf'), 'pdf');
    assert.equal(detectDocumentKind('arquivo.docx'), 'docx');
    assert.equal(detectDocumentKind('arquivo.xlsx'), 'xlsx');
    assert.equal(detectDocumentKind('arquivo.pptx'), 'pptx');
    assert.equal(detectDocumentKind('arquivo.txt'), 'text');
});

test('detectDocumentKind returns null for unsupported document types', () => {
    assert.equal(detectDocumentKind('arquivo.exe'), null);
});
