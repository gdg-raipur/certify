"use server";

import { readCertificates, writeCertificates, CertificateRecord as StorageCertificateRecord } from "@/lib/storage";

export interface CertificateRecord {
    id: string;
    name: string;
    verifyLink: string;
    issuedAt: string;
    templateId?: string;
    recipientEmail?: string;
    issuer: string;
}

export async function saveCertificates(records: CertificateRecord[]) {
    try {
        if (records.length === 0) return { success: true, count: 0 };

        const currentData = await readCertificates();
        const newRecords: StorageCertificateRecord[] = records.map(record => ({
            ...record,
            createdAt: new Date() // Storing as Date object, stringified on write
        }));

        // Append new records
        // Simple distinct check if needed, but previously onConflictDoNothing was used for ID.
        // We can check if ID exists.
        const existingIds = new Set(currentData.map(c => c.id));
        const uniqueNewRecords = newRecords.filter(r => !existingIds.has(r.id));

        if (uniqueNewRecords.length === 0) {
            return { success: true, count: 0 };
        }

        await writeCertificates([...currentData, ...uniqueNewRecords]);

        return { success: true, count: uniqueNewRecords.length };
    } catch (error) {
        console.error("Failed to save certificates:", error);
        throw new Error("Failed to save certificate data.");
    }
}

export async function getCertificate(id: string): Promise<CertificateRecord | null> {
    try {
        const data = await readCertificates();
        const cert = data.find(c => c.id === id);

        if (!cert) return null;

        return {
            id: cert.id,
            name: cert.name,
            verifyLink: cert.verifyLink,
            issuedAt: cert.issuedAt,
            templateId: cert.templateId,
            recipientEmail: cert.recipientEmail,
            issuer: cert.issuer,
        };
    } catch (error) {
        console.error("Failed to get certificate:", error);
        return null;
    }
}

export async function getAllCertificates(): Promise<CertificateRecord[]> {
    try {
        const data = await readCertificates();
        // Show newest first. Date string comparison works for ISO, but if JSON parsed as string, need 'new Date()'
        // storage.ts writes JSON.stringify so it's a string.
        return data.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }).map(cert => ({
            id: cert.id,
            name: cert.name,
            verifyLink: cert.verifyLink,
            issuedAt: cert.issuedAt,
            templateId: cert.templateId,
            recipientEmail: cert.recipientEmail,
            issuer: cert.issuer,
        }));
    } catch (error) {
        console.error("Failed to get all certificates:", error);
        return [];
    }
}
