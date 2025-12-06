"use server";

import fs from "fs/promises";
import path from "path";

const DATA_FILE_PATH = path.join(process.cwd(), "src", "data", "certificates.json");

export interface CertificateRecord {
    id: string;
    name: string;
    verifyLink: string;
    issuedAt: string;
    templateId?: string;
    issuer: string;
}

// Ensure the data directory and file exist
async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE_PATH);
    } catch {
        const dir = path.dirname(DATA_FILE_PATH);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(DATA_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
    }
}

export async function saveCertificates(records: CertificateRecord[]) {
    await ensureDataFile();
    try {
        const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
        const existingData: CertificateRecord[] = JSON.parse(fileContent);

        // Append new records
        const updatedData = [...existingData, ...records];

        await fs.writeFile(DATA_FILE_PATH, JSON.stringify(updatedData, null, 2), "utf-8");
        return { success: true, count: records.length };
    } catch (error) {
        console.error("Failed to save certificates:", error);
        throw new Error("Failed to save certificate data.");
    }
}

export async function getCertificate(id: string): Promise<CertificateRecord | null> {
    await ensureDataFile();
    try {
        const fileContent = await fs.readFile(DATA_FILE_PATH, "utf-8");
        const data: CertificateRecord[] = JSON.parse(fileContent);
        return data.find((cert) => cert.id === id) || null;
    } catch (error) {
        console.error("Failed to get certificate:", error);
        return null;
    }
}
