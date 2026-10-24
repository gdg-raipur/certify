"use server";

import connectDB, { isDbConfigured } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { isSigningConfigured, signPayload, verifyToken } from "@/lib/signing";
import Certificate from "@/models/Certificate";

export interface CertificateRecord {
    id: string;
    name: string;
    verifyLink: string;
    issuedAt: string;
    event?: string;
    templateId?: string;
    recipientEmail?: string;
    issuer: string;
}

export interface Capabilities {
    /** Certificates can be stored in this instance's database (short QR links, admin listing). */
    registry: boolean;
    /** Certificates can be verified from a signed QR link, no database needed. */
    signing: boolean;
}

export async function getCapabilities(): Promise<Capabilities> {
    return { registry: isDbConfigured(), signing: isSigningConfigured() };
}

export interface IssueInput {
    id: string;
    name: string;
    event?: string;
    issuer?: string;
    /** YYYY-MM-DD */
    issuedOn: string;
}

export type IssueResult =
    | { ok: true; mode: "registry" | "signed"; links: Record<string, string> }
    | { ok: false; error: string };

const MAX_PER_CALL = 500;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const clip = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n);

function resolveOrigin(clientOrigin: string): string | null {
    const candidate = process.env.HOSTED_URL || clientOrigin;
    try {
        const url = new URL(candidate);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.origin;
    } catch {
        return null;
    }
}

/**
 * Registers a batch of certificates and returns the verification link for each id.
 * Uses the database when configured (short links), otherwise signed links.
 */
export async function issueCertificates(inputs: IssueInput[], clientOrigin: string): Promise<IssueResult> {
    if (!Array.isArray(inputs) || inputs.length === 0) return { ok: true, mode: "signed", links: {} };
    if (inputs.length > MAX_PER_CALL) return { ok: false, error: `Issue at most ${MAX_PER_CALL} certificates per request.` };

    const origin = resolveOrigin(clientOrigin);
    if (!origin) return { ok: false, error: "Couldn't determine this site's address for verification links." };

    const records = inputs.map((r) => ({
        id: r.id,
        name: clip(r.name, 120),
        event: clip(r.event, 120) || undefined,
        issuer: clip(r.issuer, 120),
        issuedOn: /^\d{4}-\d{2}-\d{2}$/.test(r.issuedOn) ? r.issuedOn : new Date().toISOString().slice(0, 10),
    }));
    if (records.some((r) => !ID_PATTERN.test(r.id) || !r.name)) {
        return { ok: false, error: "Every certificate needs a valid id and a recipient name." };
    }

    if (isDbConfigured()) {
        try {
            await connectDB();
            const links: Record<string, string> = {};
            const docs = records.map((r) => {
                const verifyLink = `${origin}/verify?id=${r.id}`;
                links[r.id] = verifyLink;
                return {
                    id: r.id,
                    name: r.name,
                    event: r.event,
                    issuer: r.issuer || "Certify",
                    issuedAt: r.issuedOn,
                    verifyLink,
                };
            });
            await Certificate.insertMany(docs, { ordered: false });
            return { ok: true, mode: "registry", links };
        } catch (error) {
            console.error("Certificate registry write failed:", (error as Error).message);
            if (!isSigningConfigured()) return { ok: false, error: "Couldn't save certificates to the registry. Try again." };
            // Fall through to signed links so the batch isn't lost.
        }
    }

    if (isSigningConfigured()) {
        const links: Record<string, string> = {};
        for (const r of records) {
            const token = signPayload({ i: r.id, n: r.name, e: r.event, o: r.issuer || undefined, d: r.issuedOn });
            links[r.id] = `${origin}/verify?c=${token}`;
        }
        return { ok: true, mode: "signed", links };
    }

    return { ok: false, error: "Verification isn't enabled on this instance." };
}

export interface VerifiedCertificate {
    id: string;
    name: string;
    event?: string;
    issuer?: string;
    issuedAt: string;
}

export type VerifyResult =
    | { status: "valid"; source: "registry" | "signature"; certificate: VerifiedCertificate }
    | { status: "not_found" | "invalid" | "unavailable"; message: string };

export async function verifyCertificate(query: { id?: string; token?: string }): Promise<VerifyResult> {
    const id = query.id?.trim();
    const token = query.token?.trim();

    if (token) {
        if (!isSigningConfigured()) {
            return { status: "unavailable", message: "This instance can't check signed certificates. It may have been issued by a different Certify deployment." };
        }
        const payload = verifyToken(token);
        if (!payload) {
            return { status: "invalid", message: "This certificate's signature doesn't match. It may have been altered or issued elsewhere." };
        }
        return {
            status: "valid",
            source: "signature",
            certificate: { id: payload.i, name: payload.n, event: payload.e, issuer: payload.o, issuedAt: payload.d },
        };
    }

    if (id) {
        if (!isDbConfigured()) {
            return { status: "unavailable", message: "This instance has no certificate registry, so IDs can't be looked up." };
        }
        try {
            await connectDB();
            const cert = await Certificate.findOne({ id }).lean();
            if (!cert) return { status: "not_found", message: "No certificate with this ID was found. Check the ID and try again." };
            return {
                status: "valid",
                source: "registry",
                certificate: { id: cert.id, name: cert.name, event: cert.event, issuer: cert.issuer, issuedAt: cert.issuedAt },
            };
        } catch (error) {
            console.error("Certificate lookup failed:", (error as Error).message);
            return { status: "unavailable", message: "The registry couldn't be reached. Please try again in a moment." };
        }
    }

    return { status: "invalid", message: "Enter a certificate ID or link." };
}

export type AdminListResult = { ok: true; certificates: CertificateRecord[] } | { ok: false; error: string };

/** Instance-admin listing; requires ADMIN_ORG_ID / ADMIN_PASSWORD. */
export async function getAllCertificates(orgId: string, password: string): Promise<AdminListResult> {
    if (!isAdmin(orgId, password)) return { ok: false, error: "Invalid organisation ID or password." };
    if (!isDbConfigured()) return { ok: false, error: "No database is configured on this instance." };
    try {
        await connectDB();
        const certs = await Certificate.find({}).sort({ createdAt: -1 }).limit(5000).lean();
        return {
            ok: true,
            certificates: certs.map((cert) => ({
                id: cert.id,
                name: cert.name,
                verifyLink: cert.verifyLink,
                issuedAt: cert.issuedAt,
                event: cert.event,
                templateId: cert.templateId,
                recipientEmail: cert.recipientEmail,
                issuer: cert.issuer,
            })),
        };
    } catch (error) {
        console.error("Failed to list certificates:", (error as Error).message);
        return { ok: false, error: "Couldn't load certificates from the database." };
    }
}
