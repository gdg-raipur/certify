import { PDFDocument, PDFFont, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { renderTemplate, type Row } from "@/lib/template";
import type { Design, FontId, QrLayer, TextLayer } from "./types";

const STANDARD_FONTS: Record<Exclude<FontId, "custom">, StandardFonts> = {
    helvetica: StandardFonts.Helvetica,
    "helvetica-bold": StandardFonts.HelveticaBold,
    times: StandardFonts.TimesRoman,
    "times-bold": StandardFonts.TimesRomanBold,
    courier: StandardFonts.Courier,
    "courier-bold": StandardFonts.CourierBold,
};

/** Longest side of the PDF page in points (A4 is 842pt). Large templates are scaled down; the image keeps full resolution. */
const MAX_PAGE_SIDE = 842;

function hexToRgb(hex: string) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    const n = m ? parseInt(m[1], 16) : 0;
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Vertical offset from visual center to baseline, as a fraction of font size (≈ half the cap height). */
const BASELINE_OFFSET = 0.35;

export class CertificateRenderer {
    private constructor(
        private design: Design & { template: NonNullable<Design["template"]> },
        private baseBytes: Uint8Array,
        private scale: number
    ) {}

    /** Embeds the template once so each certificate only has to load a ready-made page. */
    static async create(design: Design): Promise<CertificateRenderer> {
        const template = design.template;
        if (!template) throw new Error("No template uploaded.");
        const scale = Math.min(1, MAX_PAGE_SIDE / Math.max(template.width, template.height));
        const base = await PDFDocument.create();
        const page = base.addPage([template.width * scale, template.height * scale]);
        const image = template.kind === "png" ? await base.embedPng(template.bytes) : await base.embedJpg(template.bytes);
        page.drawImage(image, { x: 0, y: 0, width: template.width * scale, height: template.height * scale });
        return new CertificateRenderer({ ...design, template }, await base.save(), scale);
    }

    /**
     * Renders one certificate.
     * @param vars placeholder values for this recipient
     * @param qrText content for the QR layer, or null to omit it
     */
    async render(vars: Row, qrText: string | null, title?: string): Promise<Uint8Array> {
        const pdf = await PDFDocument.load(this.baseBytes);
        if (title) pdf.setTitle(title);
        pdf.setCreator("Certify");
        const page = pdf.getPage(0);
        const fonts = new Map<FontId, PDFFont>();

        const getFont = async (id: FontId) => {
            let font = fonts.get(id);
            if (!font) {
                if (id === "custom") {
                    if (!this.design.customFont) throw new Error("Custom font selected but not uploaded.");
                    pdf.registerFontkit(fontkit);
                    font = await pdf.embedFont(this.design.customFont.bytes, { subset: true });
                } else {
                    font = await pdf.embedFont(STANDARD_FONTS[id]);
                }
                fonts.set(id, font);
            }
            return font;
        };

        for (const layer of this.design.layers) {
            if (layer.type === "text") {
                await this.drawText(page, layer, renderTemplate(layer.content, vars), await getFont(layer.font));
            } else if (qrText) {
                this.drawQr(page, layer, qrText);
            }
        }

        return pdf.save();
    }

    private drawText(page: PDFPage, layer: TextLayer, raw: string, font: PDFFont) {
        const text = raw.replace(/\s+/g, " ").trim();
        if (!text) return;
        const s = this.scale;
        const pageHeight = this.design.template.height * s;
        let size = layer.fontSize * s;
        let width: number;
        try {
            width = font.widthOfTextAtSize(text, size);
        } catch {
            throw new Error(`"${text}" has characters the selected font can't display. Upload a custom font (for example Noto Sans) that supports them.`);
        }
        const maxWidth = layer.maxWidth * s;
        if (maxWidth > 0 && width > maxWidth) {
            size = (size * maxWidth) / width;
            width = maxWidth;
        }
        const anchorX = layer.x * s;
        const x = layer.align === "left" ? anchorX : layer.align === "right" ? anchorX - width : anchorX - width / 2;
        const y = pageHeight - layer.y * s - size * BASELINE_OFFSET;
        page.drawText(text, { x, y, size, font, color: hexToRgb(layer.color) });
    }

    /** Draws the QR code as vector paths on a white quiet zone so it scans on any background and prints sharply. */
    private drawQr(page: PDFPage, layer: QrLayer, text: string) {
        const s = this.scale;
        const pageHeight = this.design.template.height * s;
        const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
        const n = qr.modules.size;
        const data = qr.modules.data;
        const margin = 2;
        const size = layer.size * s;
        const cell = size / (n + margin * 2);
        const left = layer.x * s - size / 2;
        const top = pageHeight - layer.y * s + size / 2;

        page.drawRectangle({ x: left, y: top - size, width: size, height: size, color: rgb(1, 1, 1) });

        let path = "";
        for (let r = 0; r < n; r++) {
            let c = 0;
            while (c < n) {
                if (data[r * n + c]) {
                    const start = c;
                    while (c < n && data[r * n + c]) c++;
                    path += `M${start} ${r}h${c - start}v1h${start - c}z`;
                } else {
                    c++;
                }
            }
        }
        page.drawSvgPath(path, { x: left + margin * cell, y: top - margin * cell, scale: cell, color: rgb(0, 0, 0) });
    }
}
