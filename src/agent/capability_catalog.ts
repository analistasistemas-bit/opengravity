export type DocumentKind = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'text';
export type DocumentActionId = 'summarize' | 'extract_text' | 'list_sheets' | 'list_slides';

export type DocumentAction = {
    id: DocumentActionId;
    label: string;
};

export type DocumentCapability = {
    kind: DocumentKind;
    actions: DocumentAction[];
};

const CAPABILITIES: Record<DocumentKind, DocumentAction[]> = {
    pdf: [
        { id: 'summarize', label: 'resumir' },
        { id: 'extract_text', label: 'extrair texto' },
    ],
    docx: [
        { id: 'summarize', label: 'resumir' },
        { id: 'extract_text', label: 'extrair texto' },
    ],
    xlsx: [
        { id: 'summarize', label: 'resumir' },
        { id: 'list_sheets', label: 'listar abas' },
        { id: 'extract_text', label: 'extrair texto tabular' },
    ],
    pptx: [
        { id: 'summarize', label: 'resumir' },
        { id: 'list_slides', label: 'listar slides' },
        { id: 'extract_text', label: 'extrair texto' },
    ],
    text: [
        { id: 'summarize', label: 'resumir' },
        { id: 'extract_text', label: 'extrair texto' },
    ],
};

function detectKindFromFileName(fileName: string): DocumentKind | null {
    const normalized = fileName.toLowerCase();

    if (normalized.endsWith('.pdf')) return 'pdf';
    if (normalized.endsWith('.docx')) return 'docx';
    if (normalized.endsWith('.xlsx')) return 'xlsx';
    if (normalized.endsWith('.pptx')) return 'pptx';
    if (/\.(txt|md|json|csv)$/i.test(normalized)) return 'text';

    return null;
}

export function getDocumentCapability(fileName: string): DocumentCapability | null {
    const kind = detectKindFromFileName(fileName);
    if (!kind) {
        return null;
    }

    return {
        kind,
        actions: CAPABILITIES[kind],
    };
}

export function buildDocumentActionPrompt(fileName: string, capability: DocumentCapability): string {
    const options = capability.actions.map((action) => action.label).join(', ');
    return `Recebi \`${fileName}\`. O que voce quer fazer com ele? Posso ${options}.`;
}
