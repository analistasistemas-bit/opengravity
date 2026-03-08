import test from 'node:test';
import assert from 'node:assert/strict';

import { PendingDocumentJobs } from '../src/lib/pending_document_jobs.js';

test('PendingDocumentJobs stores and clears per-user jobs', () => {
    const jobs = new PendingDocumentJobs();

    jobs.set(1, {
        fileName: 'relatorio.pdf',
        filePath: '/tmp/relatorio.pdf',
        kind: 'pdf',
        actions: ['summarize', 'extract_text'],
    });

    assert.equal(jobs.get(1)?.fileName, 'relatorio.pdf');
    assert.equal(jobs.get(2), null);

    jobs.clear(1);
    assert.equal(jobs.get(1), null);
});
