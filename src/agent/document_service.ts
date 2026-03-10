import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import type { Bot } from 'grammy';
import { config } from '../config.js';
import type { DocumentActionId, DocumentKind } from './capability_catalog.js';

export function detectDocumentKind(fileName: string): DocumentKind | null {
    const normalized = fileName.toLowerCase();

    if (normalized.endsWith('.pdf')) return 'pdf';
    if (normalized.endsWith('.docx')) return 'docx';
    if (normalized.endsWith('.xlsx')) return 'xlsx';
    if (normalized.endsWith('.pptx')) return 'pptx';
    if (/\.(txt|md|json|csv)$/i.test(normalized)) return 'text';

    return null;
}

export function parseDocumentActionReply(text: string): DocumentActionId | null {
    const normalized = text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    if (/resum|sumar/i.test(normalized)) return 'summarize';
    if (/extrai|texto|ler|conteudo/i.test(normalized)) return 'extract_text';
    if (/aba|planilha|sheet/i.test(normalized)) return 'list_sheets';
    if (/slide|apresenta/i.test(normalized)) return 'list_slides';

    return null;
}

function stripXml(text: string): string {
    return text
        .replace(/<a:tab[^>]*\/>/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

export class DocumentService {
    static async downloadTelegramDocument(bot: Bot, fileId: string, fileName: string): Promise<string> {
        const tempDirPath = path.join(os.tmpdir(), 'opengravity-documents');
        await fs.ensureDir(tempDirPath);

        const safeName = fileName.replace(/[^\w.\-]+/g, '_');
        const tempFilePath = path.join(tempDirPath, `${Date.now()}-${safeName}`);
        const file = await bot.api.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`Falha ao baixar documento: ${response.statusText}`);
        }

        const buffer = await response.buffer();
        await fs.writeFile(tempFilePath, buffer);
        return tempFilePath;
    }

    static async cleanup(filePath: string) {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
        }
    }

    static async runAction(filePath: string, fileName: string, action: DocumentActionId): Promise<string> {
        const kind = detectDocumentKind(fileName);
        if (!kind) {
            throw new Error('Tipo de arquivo nao suportado.');
        }

        switch (action) {
            case 'extract_text':
                return this.extractText(filePath, kind);
            case 'list_sheets':
                return this.listSheets(filePath);
            case 'list_slides':
                return this.listSlides(filePath);
            case 'summarize': {
                const extracted = await this.extractText(filePath, kind);
                return extracted;
            }
            default:
                throw new Error('Acao de documento nao suportada.');
        }
    }

    static async extractText(filePath: string, kind: DocumentKind): Promise<string> {
        switch (kind) {
            case 'pdf': {
                const buffer = await fs.readFile(filePath);
                const result = await pdfParse(buffer);
                return result.text.trim();
            }
            case 'docx': {
                const result = await mammoth.extractRawText({ path: filePath });
                return result.value.trim();
            }
            case 'xlsx': {
                const workbook = XLSX.readFile(filePath);
                return workbook.SheetNames.map((sheetName: string) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    return `Aba: ${sheetName}\n${csv}`.trim();
                }).join('\n\n');
            }
            case 'pptx': {
                const zip = await JSZip.loadAsync(await fs.readFile(filePath));
                const slideFiles = Object.keys(zip.files)
                    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                const slides = await Promise.all(slideFiles.map(async (slideFile, index) => {
                    const xml = await zip.files[slideFile].async('string');
                    return `Slide ${index + 1}: ${stripXml(xml)}`.trim();
                }));
                return slides.join('\n\n');
            }
            case 'text':
                return (await fs.readFile(filePath, 'utf-8')).trim();
            default:
                throw new Error('Tipo de arquivo nao suportado para extracao.');
        }
    }

    static async listSheets(filePath: string): Promise<string> {
        const workbook = XLSX.readFile(filePath);
        return workbook.SheetNames.join('\n');
    }

    static async listSlides(filePath: string): Promise<string> {
        const zip = await JSZip.loadAsync(await fs.readFile(filePath));
        const slideFiles = Object.keys(zip.files)
            .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

        return slideFiles.map((_, index) => `Slide ${index + 1}`).join('\n');
    }
}
