import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Stateless certificate tokens: base64url(JSON payload) + "." + truncated HMAC-SHA256.
// They let a Certify instance verify certificates it issued without any database.
// Keys are single letters and the MAC is truncated to 128 bits to keep QR codes small.

export interface TokenPayload {
    /** certificate id */
    i: string;
    /** recipient name */
    n: string;
    /** event / certificate title */
    e?: string;
    /** issuer */
    o?: string;
    /** issue date, YYYY-MM-DD */
    d: string;
}

const MAC_LENGTH = 22; // base64url chars ≈ 128 bits

function getSecret(): string | null {
    const s = process.env.CERTIFY_SECRET;
    return s && s.length >= 16 ? s : null;
}

export function isSigningConfigured(): boolean {
    return getSecret() !== null;
}

function mac(data: string, secret: string): string {
    return createHmac("sha256", secret).update(data).digest("base64url").slice(0, MAC_LENGTH);
}

export function signPayload(payload: TokenPayload): string {
    const secret = getSecret();
    if (!secret) throw new Error("CERTIFY_SECRET is not configured.");
    const clean: TokenPayload = { i: payload.i, n: payload.n, d: payload.d };
    if (payload.e) clean.e = payload.e;
    if (payload.o) clean.o = payload.o;
    const body = Buffer.from(JSON.stringify(clean), "utf8").toString("base64url");
    return `${body}.${mac(body, secret)}`;
}

export function verifyToken(token: string): TokenPayload | null {
    const secret = getSecret();
    if (!secret) return null;
    const [body, sig] = token.trim().split(".");
    if (!body || !sig || sig.length !== MAC_LENGTH) return null;
    const expected = Buffer.from(mac(body, secret));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
        if (typeof payload.i !== "string" || typeof payload.n !== "string" || typeof payload.d !== "string") return null;
        return payload;
    } catch {
        return null;
    }
}
