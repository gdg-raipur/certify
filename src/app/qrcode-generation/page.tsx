import type { Metadata } from "next";
import { QrGenerator } from "@/components/QrGenerator";

export const metadata: Metadata = {
    title: "QR Codes",
    description: "Turn any link or text into a QR code and download it as PNG or SVG.",
};

export default function QRCodeGenerationPage() {
    return <QrGenerator />;
}
