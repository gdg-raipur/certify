"use server";

// SMTP credentials and recipient data pass through here only to send mail.
// Nothing is persisted, and nothing identifying is logged.

import nodemailer from "nodemailer";
import { lookup } from "dns/promises";
import { isIP } from "net";
import type { OutgoingEmail, SendResult, SMTPConfig } from "@/lib/smtp";
import { isValidEmail } from "@/lib/utils";

/** Keeps each server action call well inside serverless time limits. */
const MAX_MESSAGES_PER_CALL = 10;

function isPrivateAddress(ip: string): boolean {
    if (ip === "::1" || ip === "::" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
    const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
    if (isIP(v4) !== 4) return false;
    const [a, b] = v4.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function assertPublicHost(host: string) {
    if (process.env.ALLOW_PRIVATE_SMTP === "true") return;
    let address = host;
    if (!isIP(host)) {
        try {
            address = (await lookup(host)).address;
        } catch {
            throw new Error(`Could not resolve SMTP host "${host}".`);
        }
    }
    if (isPrivateAddress(address)) {
        throw new Error("SMTP hosts on private networks are blocked on this instance. Self-host and set ALLOW_PRIVATE_SMTP=true to use one.");
    }
}

function validateConfig(config: SMTPConfig): string | null {
    if (!config?.host?.trim() || !config.user?.trim() || !config.pass) return "SMTP host, username and password are required.";
    const port = Number(config.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return "SMTP port must be a number between 1 and 65535.";
    const from = config.fromEmail?.trim();
    if (from && !isValidEmail(from)) return "The sender address isn't a valid email.";
    return null;
}

async function createTransport(config: SMTPConfig) {
    const host = config.host.trim();
    await assertPublicHost(host);
    const port = Number(config.port) || 587;
    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: config.user.trim(), pass: config.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });
}

function friendlyError(error: unknown): string {
    const e = error as { code?: string; responseCode?: number; message?: string };
    if (e.code === "EAUTH" || e.responseCode === 535) {
        return "Authentication failed. Check the username and password (Gmail and Outlook need an app password).";
    }
    if (e.code === "ETIMEDOUT" || e.code === "ECONNECTION" || e.code === "ESOCKET") {
        return "Couldn't connect to the SMTP server. Check the host and port.";
    }
    if (e.code === "EDNS") return "Couldn't resolve the SMTP host.";
    return e.message || "Unknown error";
}

/** Opens a connection and authenticates without sending anything. */
export async function verifySmtp(config: SMTPConfig): Promise<{ ok: boolean; error?: string }> {
    const invalid = validateConfig(config);
    if (invalid) return { ok: false, error: invalid };
    try {
        const transporter = await createTransport(config);
        await transporter.verify();
        transporter.close();
        return { ok: true };
    } catch (error) {
        return { ok: false, error: friendlyError(error) };
    }
}

/**
 * Sends a small batch of fully rendered emails over one SMTP connection.
 * Results come back per recipient so the client can track and retry individually.
 */
export async function sendEmails(config: SMTPConfig, messages: OutgoingEmail[]): Promise<SendResult[]> {
    const invalid = validateConfig(config);
    if (invalid) return messages.map((m) => ({ to: m.to, ok: false, error: invalid }));
    if (messages.length > MAX_MESSAGES_PER_CALL) {
        throw new Error(`Send at most ${MAX_MESSAGES_PER_CALL} messages per call.`);
    }

    let transporter: Awaited<ReturnType<typeof createTransport>>;
    try {
        transporter = await createTransport(config);
    } catch (error) {
        const msg = friendlyError(error);
        return messages.map((m) => ({ to: m.to, ok: false, error: msg }));
    }

    const fromAddress = config.fromEmail?.trim() || config.user.trim();
    const from = config.fromName?.trim() ? { name: config.fromName.trim(), address: fromAddress } : fromAddress;
    const results: SendResult[] = [];

    for (const message of messages) {
        const to = message.to?.trim();
        if (!to || !isValidEmail(to)) {
            results.push({ to: message.to, ok: false, error: "Invalid email address" });
            continue;
        }
        try {
            await transporter.sendMail({
                from,
                to,
                replyTo: config.replyTo?.trim() || undefined,
                subject: message.subject,
                text: message.text,
                html: message.html,
                attachments: message.attachments?.map((a) => ({
                    filename: a.filename,
                    content: a.contentBase64,
                    encoding: "base64",
                    contentType: a.contentType,
                })),
            });
            results.push({ to, ok: true });
        } catch (error) {
            results.push({ to, ok: false, error: friendlyError(error) });
            // An auth failure will fail every remaining message; stop early.
            if ((error as { code?: string }).code === "EAUTH") {
                for (const rest of messages.slice(results.length)) {
                    results.push({ to: rest.to, ok: false, error: friendlyError(error) });
                }
                break;
            }
        }
    }

    transporter.close();
    return results;
}
