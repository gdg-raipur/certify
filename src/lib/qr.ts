// handles QR Code generation across the app
//inputs: verifyLink
//outputs: A QR code image in bytes
import QRCode from "qrcode";

export async function generateQRCode(verifyLink: string): Promise<ArrayBuffer> {
    if (!verifyLink) {
        throw new Error("QR Code generation failed: verifyLink is empty");
    }

    try {
        const qrDataUrl = await QRCode.toDataURL(verifyLink, {
            errorCorrectionLevel: 'M',
            margin: 1
        });
        const res = await fetch(qrDataUrl);
        return await res.arrayBuffer();
    } catch (err) {
        console.error("QR Generation Error", err);
        throw err;
    }
}