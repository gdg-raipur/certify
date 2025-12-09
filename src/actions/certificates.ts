"use server";

import { db } from "@/db";
import { certificates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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

        await db.insert(certificates).values(records.map(record => ({
            id: record.id,
            name: record.name,
            verifyLink: record.verifyLink,
            issuedAt: record.issuedAt,
            templateId: record.templateId, // Using templateId based on schema
            recipientEmail: record.recipientEmail,
            issuer: record.issuer,
        }))).onConflictDoNothing();

        return { success: true, count: records.length };
    } catch (error) {
        console.error("Failed to save certificates:", error);
        throw new Error("Failed to save certificate data.");
    }
}

export async function getCertificate(id: string): Promise<CertificateRecord | null> {
    try {
        const result = await db.select().from(certificates).where(eq(certificates.id, id)).limit(1);

        if (result.length === 0) return null;

        const cert = result[0];
        return {
            id: cert.id,
            name: cert.name,
            verifyLink: cert.verifyLink,
            issuedAt: cert.issuedAt,
            templateId: cert.templateId || undefined,
            recipientEmail: cert.recipientEmail || undefined,
            issuer: cert.issuer,
        };
    } catch (error) {
        console.error("Failed to get certificate:", error);
        return null;
    }
}

export async function getAllCertificates(): Promise<CertificateRecord[]> {
    try {
        // Show newest first
        const results = await db.select().from(certificates).orderBy(desc(certificates.createdAt));

        return results.map(cert => ({
            id: cert.id,
            name: cert.name,
            verifyLink: cert.verifyLink,
            issuedAt: cert.issuedAt,
            templateId: cert.templateId || undefined,
            recipientEmail: cert.recipientEmail || undefined,
            issuer: cert.issuer,
        }));
    } catch (error) {
        console.error("Failed to get all certificates:", error);
        return [];
    }
}
