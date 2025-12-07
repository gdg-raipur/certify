"use client";

import { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { generateQRCode } from "@/lib/qr";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { saveCertificates } from "@/actions/certificates";

// Helper for download if file-saver is not available or just use simple anchor
const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

interface GenerateStepProps {
    data: any[];
    mapping: any;
    designConfig: any;
    onBack: () => void;
}

export function GenerateStep({ data, mapping, designConfig, onBack }: GenerateStepProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");

    const generateCertificates = async () => {
        setIsGenerating(true);
        setStatusMessage("Initializing...");
        setProgress(0);

        try {
            const zip = new JSZip();
            const { templateUrl, templateDimensions, namePos, qrPos, idPos } = designConfig;

            // Generate Batch Data
            const certificateRecords = [];
            const timestamp = new Date().toISOString();

            // Load template image
            setStatusMessage("Loading template...");
            const templateImageBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const name = row[mapping.name];

                // Generate Unique ID
                const uniqueId = crypto.randomUUID();

                // Construct Verify Link
                // Use the current origin or a configured base URL. For local dev, window.location.origin works.
                // In production, you might want to force a specific domain.
                const baseUrl = window.location.origin;
                const verifyLink = `${baseUrl}/verify?id=${uniqueId}`;

                // Store record for saving
                certificateRecords.push({
                    id: uniqueId,
                    name: name,
                    verifyLink: verifyLink,
                    issuedAt: timestamp,
                    issuer: "Certify App", // Could vary
                });

                setStatusMessage(`Generating ${i + 1}/${data.length}...`);

                // Create PDF
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage([templateDimensions.width, templateDimensions.height]);

                // Embed image
                // Embed image
                let image;
                // Check magic bytes to determine image type
                const header = new Uint8Array(templateImageBytes.slice(0, 4));
                const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;

                if (isPng) {
                    image = await pdfDoc.embedPng(templateImageBytes);
                } else {
                    // Fallback to JPG, or we could strict check for FF D8
                    image = await pdfDoc.embedJpg(templateImageBytes);
                }
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: templateDimensions.width,
                    height: templateDimensions.height,
                });

                // Draw Name
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const fontSize = namePos.fontSize;
                const textWidth = font.widthOfTextAtSize(name, fontSize);

                page.drawText(name, {
                    x: namePos.x - (textWidth / 2), // Center aligned
                    y: templateDimensions.height - namePos.y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });

                // Draw Unique ID (if configured in potential future updates)
                // Just drawing it small at bottom right for now if not explicitly configured, or strictly relying on QR.
                // Let's draw it small at the bottom left for verification ease if someone prints it.
                const idFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                page.drawText(`ID: ${uniqueId}`, {
                    x: 20,
                    y: 20,
                    size: 8,
                    font: idFont,
                    color: rgb(0.5, 0.5, 0.5),
                });

                // Draw QR Code pointing to Verify Link
                const qrImageBytes = await generateQRCode(verifyLink);
                const qrImage = await pdfDoc.embedPng(qrImageBytes);

                page.drawImage(qrImage, {
                    x: qrPos.x,
                    y: templateDimensions.height - qrPos.y - qrPos.size,
                    width: qrPos.size,
                    height: qrPos.size,
                });

                // Save PDF
                const pdfBytes = await pdfDoc.save();
                zip.file(`${name.replace(/[^a-z0-9]/gi, '_')}_${uniqueId.slice(0, 8)}.pdf`, pdfBytes);

                setProgress(Math.round(((i + 1) / data.length) * 100));
            }

            // Save to Database (JSON file)
            setStatusMessage("Saving records...");
            await saveCertificates(certificateRecords);

            // Generate Zip
            setStatusMessage("Compressing...");
            const content = await zip.generateAsync({ type: "blob" });
            downloadBlob(content, "certificates.zip");
            setIsDone(true);

        } catch (error) {
            console.error("Generation failed", error);
            alert("Generation failed. See console for details.");
            setStatusMessage("Failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto text-center space-y-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
                <p className="text-gray-600 mb-8">
                    We are ready to generate <span className="font-bold text-blue-600">{data.length}</span> certificates.
                    <br /><span className="text-xs text-gray-400">Each will include a unique verification QR code.</span>
                </p>

                {isGenerating ? (
                    <div className="space-y-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500">{statusMessage} {progress}%</p>
                    </div>
                ) : isDone ? (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900">Success!</h4>
                        <p className="text-gray-600">Certificates generated and saved.</p>
                        <button
                            onClick={() => setIsDone(false)}
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Generate again
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={generateCertificates}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Download className="w-6 h-6" />
                        Generate & Download Zip
                    </button>
                )}
            </div>
        </div>
    );
}
