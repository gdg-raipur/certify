import { Award, Mail, QrCode, ShieldCheck, type LucideIcon } from "lucide-react";

export const SITE = {
    name: "Certify",
    tagline: "The open-source toolkit for event communications",
    description:
        "Bulk-generate verifiable certificates, send personalized mass emails and make QR codes. Free, open source, no login: bring your own SMTP and go.",
    repo: "https://github.com/gdg-raipur/certify",
};

export interface Tool {
    href: string;
    name: string;
    short: string;
    description: string;
    icon: LucideIcon;
    /** Tailwind classes for the tool's icon chip. */
    tint: string;
}

export const TOOLS: Tool[] = [
    {
        href: "/create-certificates",
        name: "Certificates",
        short: "Bulk certificates",
        description: "Design once, generate hundreds of personalized PDF certificates with verification QR codes, then download or email them.",
        icon: Award,
        tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
        href: "/mass-email",
        name: "Mass Email",
        short: "Personalized email",
        description: "Upload a CSV, write one message with {{placeholders}}, and send a personal email to everyone using your own SMTP.",
        icon: Mail,
        tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
        href: "/qrcode-generation",
        name: "QR Codes",
        short: "QR generator",
        description: "Turn any link or text into a crisp QR code. Pick colors and size, then export PNG or SVG.",
        icon: QrCode,
        tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
        href: "/verify",
        name: "Verify",
        short: "Verify a certificate",
        description: "Check that a certificate is authentic by scanning its QR code or entering its ID.",
        icon: ShieldCheck,
        tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
];
