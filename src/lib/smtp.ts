// Client-safe SMTP types and presets (no nodemailer import here).

export interface SMTPConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
    /** Display name for the From header, e.g. "GDG Raipur". */
    fromName?: string;
    /** Sender address; defaults to the SMTP user. */
    fromEmail?: string;
    replyTo?: string;
}

export interface SmtpProvider {
    id: string;
    name: string;
    host: string;
    port: number;
    help?: string;
}

export const SMTP_PROVIDERS: SmtpProvider[] = [
    {
        id: "gmail",
        name: "Gmail / Google Workspace",
        host: "smtp.gmail.com",
        port: 587,
        help: "Use an App Password (Google Account → Security → 2-Step Verification → App passwords), not your normal password.",
    },
    {
        id: "outlook",
        name: "Outlook / Microsoft 365",
        host: "smtp.office365.com",
        port: 587,
        help: "SMTP AUTH must be enabled for the mailbox. Accounts with 2FA need an app password.",
    },
    { id: "zoho", name: "Zoho Mail", host: "smtp.zoho.com", port: 587, help: "Use an app-specific password if 2FA is on." },
    { id: "yahoo", name: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587, help: "Generate an app password in Yahoo account security." },
    { id: "brevo", name: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: 587, help: "Use your SMTP login and SMTP key from Brevo settings." },
    { id: "resend", name: "Resend", host: "smtp.resend.com", port: 587, help: "Username is \"resend\", password is your API key." },
    { id: "sendgrid", name: "SendGrid", host: "smtp.sendgrid.net", port: 587, help: "Username is \"apikey\", password is your API key." },
    { id: "custom", name: "Other / custom", host: "", port: 587 },
];

export function detectProvider(host: string): string {
    return SMTP_PROVIDERS.find((p) => p.host && p.host === host.trim())?.id ?? "custom";
}

export function isSmtpComplete(c: Partial<SMTPConfig>): boolean {
    return Boolean(c.host?.trim() && c.user?.trim() && c.pass && c.port);
}

export interface OutgoingEmail {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: { filename: string; contentBase64: string; contentType?: string }[];
}

export interface SendResult {
    to: string;
    ok: boolean;
    error?: string;
}
