export type FontId = "helvetica" | "helvetica-bold" | "times" | "times-bold" | "courier" | "courier-bold" | "custom";

export type Align = "left" | "center" | "right";

export interface TextLayer {
    id: string;
    type: "text";
    /** Text with {{placeholders}}, e.g. "{{Name}}" or "Certificate ID: {{certificate_id}}" */
    content: string;
    /** Anchor point in template pixels; x is interpreted according to align, y is the vertical center. */
    x: number;
    y: number;
    fontSize: number;
    color: string;
    font: FontId;
    align: Align;
    /** Shrinks the text to fit this width in template pixels. 0 disables auto-fit. */
    maxWidth: number;
}

export interface QrLayer {
    id: string;
    type: "qr";
    /** Center point in template pixels */
    x: number;
    y: number;
    size: number;
    /** "verify" encodes the verification link; anything else is the CSV column to encode. */
    source: string;
}

export type Layer = TextLayer | QrLayer;

export interface TemplateImage {
    name: string;
    url: string;
    bytes: ArrayBuffer;
    kind: "png" | "jpg";
    width: number;
    height: number;
}

export interface CustomFont {
    name: string;
    bytes: ArrayBuffer;
    /** CSS font-family the font was registered under for previews. */
    family: string;
}

export interface Design {
    template: TemplateImage | null;
    layers: Layer[];
    customFont: CustomFont | null;
}

export interface CertificateDetails {
    event: string;
    issuer: string;
    /** YYYY-MM-DD */
    issuedOn: string;
}

export const BUILTIN_VARIABLES = ["certificate_id", "issue_date", "event", "issuer"] as const;
