
import fs from 'fs/promises';
import path from 'path';

// Define the interface to match the existing schema structure as much as possible
// but adapted for JSON storage
export interface CertificateRecord {
    id: string;
    name: string;
    verifyLink: string;
    issuedAt: string;
    templateId?: string;
    recipientEmail?: string;
    issuer: string;
    createdAt?: Date; // Optional in JSON, but useful
}

const DATA_FILE_PATH = path.join(process.cwd(), 'data.json');

async function ensureFileExists() {
    try {
        await fs.access(DATA_FILE_PATH);
    } catch {
        // Create empty array if file doesn't exist
        await fs.writeFile(DATA_FILE_PATH, '[]', 'utf-8');
    }
}

export async function readCertificates(): Promise<CertificateRecord[]> {
    await ensureFileExists();
    try {
        const data = await fs.readFile(DATA_FILE_PATH, 'utf-8');
        return JSON.parse(data) as CertificateRecord[];
    } catch (error) {
        console.error("Failed to read certificates from data.json:", error);
        return [];
    }
}

export async function writeCertificates(certificates: CertificateRecord[]): Promise<void> {
    await ensureFileExists();
    try {
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(certificates, null, 2), 'utf-8');
    } catch (error) {
        console.error("Failed to write certificates to data.json:", error);
        throw new Error("Failed to save certificate data.");
    }
}
