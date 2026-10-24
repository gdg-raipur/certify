import type { Row } from "@/lib/template";
import type { CertificateDetails, FontId } from "./types";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 12-character base62 id (~71 bits). Shorter than a UUID so QR codes stay scannable. */
export function generateCertificateId(length = 12): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let out = "";
    for (const b of bytes) out += ALPHABET[b % 62];
    return out;
}

export function formatIssueDate(isoDate: string): string {
    const d = new Date(`${isoDate}T00:00:00`);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Variables available to text layers, email templates and file names for one recipient. */
export function buildVariables(row: Row, details: CertificateDetails, certificateId: string, verifyLink = ""): Row {
    return {
        event: details.event,
        issuer: details.issuer,
        issue_date: formatIssueDate(details.issuedOn),
        ...row,
        certificate_id: certificateId,
        verify_link: verifyLink,
    };
}

export function safeFilename(name: string): string {
    const cleaned = name
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
    return cleaned || "certificate";
}

export const FONT_OPTIONS: { id: FontId; label: string }[] = [
    { id: "helvetica-bold", label: "Sans Bold" },
    { id: "helvetica", label: "Sans" },
    { id: "times-bold", label: "Serif Bold" },
    { id: "times", label: "Serif" },
    { id: "courier-bold", label: "Mono Bold" },
    { id: "courier", label: "Mono" },
];

/** CSS font shorthand pieces that approximate each PDF standard font in previews. */
export function cssFont(font: FontId, customFamily?: string): { fontFamily: string; fontWeight: number } {
    const bold = font.endsWith("-bold");
    if (font === "custom") return { fontFamily: `"${customFamily ?? "sans-serif"}", sans-serif`, fontWeight: 400 };
    if (font.startsWith("times")) return { fontFamily: '"Times New Roman", Times, serif', fontWeight: bold ? 700 : 400 };
    if (font.startsWith("courier")) return { fontFamily: '"Courier New", Courier, monospace', fontWeight: bold ? 700 : 400 };
    return { fontFamily: "Helvetica, Arial, sans-serif", fontWeight: bold ? 700 : 400 };
}

let measureCtx: CanvasRenderingContext2D | null = null;

/** Measures text width in px for previews (mirrors the PDF auto-fit logic). */
export function measureText(text: string, fontSize: number, font: FontId, customFamily?: string): number {
    if (typeof document === "undefined") return 0;
    measureCtx ??= document.createElement("canvas").getContext("2d");
    if (!measureCtx) return 0;
    const { fontFamily, fontWeight } = cssFont(font, customFamily);
    measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return measureCtx.measureText(text).width;
}

export function uint8ToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
