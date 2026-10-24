import "server-only";
import { createHash, timingSafeEqual } from "crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Checks instance-admin credentials from ADMIN_ORG_ID / ADMIN_PASSWORD. */
export function isAdmin(orgId: string, password: string): boolean {
    const validOrgId = process.env.ADMIN_ORG_ID;
    const validPassword = process.env.ADMIN_PASSWORD;
    if (!validOrgId || !validPassword) return false;
    const orgOk = timingSafeEqual(digest(orgId ?? ""), digest(validOrgId));
    const passOk = timingSafeEqual(digest(password ?? ""), digest(validPassword));
    return orgOk && passOk;
}

export function isAdminConfigured(): boolean {
    return Boolean(process.env.ADMIN_ORG_ID && process.env.ADMIN_PASSWORD);
}
