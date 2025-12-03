"use client";

import { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import QRCode from "qrcode";
import { saveAs } from "file-saver"; // I might need to install file-saver or just use a helper
import { Download, Loader2, CheckCircle } from "lucide-react";

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
}

export function GenerateStep({ data, mapping, designConfig }: GenerateStepProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isDone, setIsDone] = useState(false);

    const generateCertificates = async () => {
        setIsGenerating(true);
        setProgress(0);

        try {
            const zip = new JSZip();
            const { templateUrl, templateDimensions, namePos, qrPos, idPos } = designConfig;

            // Load template image
            const templateImageBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());

            // We'll create a PDF for each certificate or one PDF with multiple pages?
            // Requirement says "Return/download all generated certificates in bulk (e.g., zip archive)"
            // So individual files (PDF or Image) in a Zip is best. Let's do PDFs.

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const name = row[mapping.name];
                const verifyLink = mapping.verifyLink ? row[mapping.verifyLink] : "";
                const id = row.id || `CERT-${i + 1}`; // Fallback ID

                // Create PDF
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage([templateDimensions.width, templateDimensions.height]);

                // Embed image
                let image;
                if (templateUrl.includes("png")) {
                    image = await pdfDoc.embedPng(templateImageBytes);
                } else {
                    image = await pdfDoc.embedJpg(templateImageBytes);
                }
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: templateDimensions.width,
                    height: templateDimensions.height,
                });

                // Draw Name
                // Note: pdf-lib coordinates start from bottom-left by default? Yes.
                // But our design tool might have assumed top-left.
                // We need to convert coordinates.
                // Let's assume DesignStep output top-left coordinates.
                // PDF Y = Height - Design Y

                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const fontSize = namePos.fontSize;
                const textWidth = font.widthOfTextAtSize(name, fontSize);

                page.drawText(name, {
                    x: namePos.x - (textWidth / 2), // Center aligned
                    y: templateDimensions.height - namePos.y,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0), // TODO: Parse hex color
                });

                // Draw QR
                if (verifyLink) {
                    const qrDataUrl = await QRCode.toDataURL(verifyLink);
                    const qrImageBytes = await fetch(qrDataUrl).then((res) => res.arrayBuffer());
                    const qrImage = await pdfDoc.embedPng(qrImageBytes);

                    page.drawImage(qrImage, {
                        x: qrPos.x,
                        y: templateDimensions.height - qrPos.y - qrPos.size, // Bottom-left of image
                        width: qrPos.size,
                        height: qrPos.size,
                    });
                }

                // Save PDF
                const pdfBytes = await pdfDoc.save();
                zip.file(`${name.replace(/[^a-z0-9]/gi, '_')}_certificate.pdf`, pdfBytes);

                setProgress(Math.round(((i + 1) / data.length) * 100));
            }

            // Generate Zip
            const content = await zip.generateAsync({ type: "blob" });
            downloadBlob(content, "certificates.zip");
            setIsDone(true);

        } catch (error) {
            console.error("Generation failed", error);
            alert("Generation failed. See console for details.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto text-center space-y-8">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Generate</h3>
                <p className="text-gray-600 mb-8">
                    We are ready to generate <span className="font-bold text-blue-600">{data.length}</span> certificates based on your design.
                </p>

                {isGenerating ? (
                    <div className="space-y-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500">Generating... {progress}%</p>
                    </div>
                ) : isDone ? (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                        <h4 className="text-xl font-semibold text-gray-900">Success!</h4>
                        <p className="text-gray-600">Your certificates have been downloaded.</p>
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
