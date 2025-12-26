"use server";

import connectDB from "@/lib/db";
import Certificate from "@/models/Certificate";

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

        await connectDB();

        // Prepare records for insertion
        // Check for existing IDs to avoid unique constraint errors if any duplicates attempt to sneak in
        const recordIds = records.map(r => r.id);
        const existingCertificates = await Certificate.find({ id: { $in: recordIds } }).select('id');
        const existingIds = new Set(existingCertificates.map(c => c.id));

        const newRecords = records.filter(r => !existingIds.has(r.id)).map(record => ({
            ...record,
            createdAt: new Date()
        }));

        if (newRecords.length === 0) {
            return { success: true, count: 0 };
        }

        await Certificate.insertMany(newRecords);

        return { success: true, count: newRecords.length };
    } catch (error) {
        console.error("Failed to save certificates:", error);
        throw new Error("Failed to save certificate data.");
    }
}

export async function getCertificate(id: string): Promise<CertificateRecord | null> {
    try {
        await connectDB();
        // lean() returns a plain JS object instead of a Mongoose document
        const cert = await Certificate.findOne({ id }).lean();

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
        await connectDB();
        const certs = await Certificate.find({}).sort({ createdAt: -1 }).lean();

        return certs.map(cert => ({
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
