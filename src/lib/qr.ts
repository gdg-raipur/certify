// QR code helpers shared by the QR generator page and certificate previews.
import QRCode from "qrcode";

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export interface QrOptions {
    /** Output width in pixels (PNG only). */
    width?: number;
    margin?: number;
    dark?: string;
    light?: string;
    errorCorrectionLevel?: ErrorCorrection;
}

function toQrcodeOptions(opts: QrOptions) {
    return {
        errorCorrectionLevel: opts.errorCorrectionLevel ?? "M",
        margin: opts.margin ?? 1,
        width: opts.width,
        color: { dark: opts.dark ?? "#000000", light: opts.light ?? "#ffffff" },
    };
}

export async function generateQRDataUrl(text: string, opts: QrOptions = {}): Promise<string> {
    if (!text) throw new Error("QR Code generation failed: text is empty");
    return QRCode.toDataURL(text, toQrcodeOptions(opts));
}

export async function generateQRSvg(text: string, opts: QrOptions = {}): Promise<string> {
    if (!text) throw new Error("QR Code generation failed: text is empty");
    return QRCode.toString(text, { ...toQrcodeOptions(opts), type: "svg" });
}

/** Number of modules per side; useful to warn when a QR gets too dense for its printed size. */
export function qrModuleCount(text: string, level: ErrorCorrection = "M"): number {
    return QRCode.create(text, { errorCorrectionLevel: level }).modules.size;
}
