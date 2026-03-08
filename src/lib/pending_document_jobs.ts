import type { DocumentActionId, DocumentKind } from '../agent/capability_catalog.js';

export type PendingDocumentJob = {
    fileName: string;
    filePath: string;
    kind: DocumentKind;
    actions: DocumentActionId[];
};

export class PendingDocumentJobs {
    private readonly jobs = new Map<number, PendingDocumentJob>();

    get(userId: number): PendingDocumentJob | null {
        return this.jobs.get(userId) || null;
    }

    set(userId: number, job: PendingDocumentJob) {
        this.jobs.set(userId, job);
    }

    clear(userId: number) {
        this.jobs.delete(userId);
    }
}
