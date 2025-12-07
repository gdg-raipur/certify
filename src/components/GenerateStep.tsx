"use client";

import { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { generateQRCode } from "@/lib/qr";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { saveCertificates } from "@/actions/certificates";
import { sendCertificateEmail } from "@/actions/email";
import { isValidEmail, pLimit } from "@/lib/utils";

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

    // Email State
    const [showEmailConfig, setShowEmailConfig] = useState(false);
    const [emailSubject, setEmailSubject] = useState("Your Certificate");
    const [emailBody, setEmailBody] = useState("Here is your certificate attached.");
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set(data.map((_, i) => i)));
    const [emailStatuses, setEmailStatuses] = useState<Record<number, "pending" | "sent" | "failed" | "skipped">>({});

    const toggleRecipient = (index: number) => {
        const newSelected = new Set(selectedIndices);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedIndices(newSelected);
    };

    const toggleAll = () => {
        if (selectedIndices.size === data.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(data.map((_, i) => i)));
        }
    };

    const generateCertificates = async () => {
        setIsGenerating(true);
        setStatusMessage("Initializing...");
        setProgress(0);
        setEmailStatuses({});

        try {
            const zip = new JSZip();
            const { templateUrl, templateDimensions, namePos, qrPos, idPos } = designConfig;

            // Generate Batch Data
            const certificateRecords = [];
            const timestamp = new Date().toISOString();
            const emailTasks: (() => Promise<any>)[] = [];

            // Load template image
            setStatusMessage("Loading template...");
            const templateImageBytes = await fetch(templateUrl).then((res) => res.arrayBuffer());

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const name = row[mapping.name];
                const email = mapping.email ? row[mapping.email] : undefined;
                const shouldSendEmail = showEmailConfig && email && selectedIndices.has(i);

                // Generate Unique ID
                const uniqueId = crypto.randomUUID();

                // Construct Verify Link
                const baseUrl = window.location.origin;
                const verifyLink = `${baseUrl}/verify?id=${uniqueId}`;

                // Store record for saving
                certificateRecords.push({
                    id: uniqueId,
                    name: name,
                    verifyLink: verifyLink,
                    issuedAt: timestamp,
                    issuer: "Certify App",
                    recipientEmail: email,
                });

                setStatusMessage(`Processing ${i + 1}/${data.length}...`);

                // Create PDF
                const pdfDoc = await PDFDocument.create();
                const page = pdfDoc.addPage([templateDimensions.width, templateDimensions.height]);

                // Embed image
                let image;
                const header = new Uint8Array(templateImageBytes.slice(0, 4));
                const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;

                if (isPng) {
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
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const fontSize = namePos.fontSize;
                const textWidth = font.widthOfTextAtSize(name, fontSize);

                // Calculate centered position
                // Visual vertical center of font is roughly at baseline + 0.35 * fontSize
                // We want VisualCenter at (Height - namePos.y)
                // So Baseline = (Height - namePos.y) - 0.35 * fontSize
                const textY = (templateDimensions.height - namePos.y) - (fontSize * 0.35);

                page.drawText(name, {
                    x: namePos.x - (textWidth / 2),
                    y: textY,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });

                // Draw Unique ID
                const idFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                page.drawText(`ID: ${uniqueId}`, {
                    x: 20,
                    y: 20,
                    size: 8,
                    font: idFont,
                    color: rgb(0.5, 0.5, 0.5),
                });

                // Draw QR Code
                const qrImageBytes = await generateQRCode(verifyLink);
                const qrImage = await pdfDoc.embedPng(qrImageBytes);

                // QR Pos is the center. PDF drawImage expects bottom-left.
                // CenterY = Height - qrPos.y
                // BottomLeftY = CenterY - HalfSize
                const qrY = (templateDimensions.height - qrPos.y) - (qrPos.size / 2);
                const qrX = qrPos.x - (qrPos.size / 2);

                page.drawImage(qrImage, {
                    x: qrX,
                    y: qrY,
                    width: qrPos.size,
                    height: qrPos.size,
                });

                // Save PDF
                const pdfBytes = await pdfDoc.save();
                const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${uniqueId.slice(0, 8)}.pdf`;
                zip.file(filename, pdfBytes);

                // Queue Email Task
                if (shouldSendEmail) {
                    if (!isValidEmail(email)) {
                        setEmailStatuses(prev => ({
                            ...prev,
                            [i]: "failed"
                        }));
                        console.warn(`Invalid email for row ${i}: ${email}`);
                    } else {
                        // Mark as pending initially
                        setEmailStatuses(prev => ({
                            ...prev,
                            [i]: "pending"
                        }));

                        const base64Pdf = Buffer.from(pdfBytes).toString('base64');
                        const task = async () => {
                            const result = await sendCertificateEmail(
                                email,
                                name,
                                emailSubject,
                                emailBody,
                                base64Pdf,
                                filename
                            );

                            setEmailStatuses(prev => ({
                                ...prev,
                                [i]: result.success ? "sent" : "failed"
                            }));
                            return result;
                        };
                        emailTasks.push(task);
                    }
                } else {
                    setEmailStatuses(prev => ({
                        ...prev,
                        [i]: "skipped"
                    }));
                }

                setProgress(Math.round(((i + 1) / data.length) * 50));
            }

            // Process Email Queue
            if (emailTasks.length > 0) {
                setStatusMessage(`Sending ${emailTasks.length} emails...`);

                let completedEmails = 0;
                const wrappedTasks = emailTasks.map(task => async () => {
                    const res = await task();
                    completedEmails++;
                    const emailProgress = 50 + Math.round((completedEmails / emailTasks.length) * 40);
                    setProgress(emailProgress);
                    return res;
                });

                await pLimit(3, wrappedTasks);
            } else {
                setProgress(90);
            }

            // Save to Database
            setStatusMessage("Saving records...");
            await saveCertificates(certificateRecords);

            // Generate Zip
            setStatusMessage("Compressing...");
            const content = await zip.generateAsync({ type: "blob" });
            downloadBlob(content, "certificates.zip");
            setProgress(100);
            setIsDone(true);

        } catch (error) {
            console.error("Generation failed", error);
            alert("Generation failed. See console for details.");
            setStatusMessage("Failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Calculate stats
    const totalSelected = selectedIndices.size;
    const totalEmailsWithStatus = Object.keys(emailStatuses).length;
    const sentCount = Object.values(emailStatuses).filter(s => s === "sent").length;
    const failedCount = Object.values(emailStatuses).filter(s => s === "failed").length;


    if (isGenerating || isDone) {
        return (
            <div className="w-full max-w-xl mx-auto text-center space-y-8">
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {isDone ? "Generation Complete" : "Generating Certificates"}
                    </h3>

                    {/* Progress Bar */}
                    <div className="space-y-4 mb-6">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500">{statusMessage} {progress}%</p>
                    </div>

                    {showEmailConfig && (
                        <div className="text-left text-sm space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
                            <p className="font-semibold text-gray-700">Email Status:</p>
                            <p className="text-green-600">Sent: {sentCount}</p>
                            <p className="text-red-600">Failed: {failedCount}</p>
                        </div>
                    )}

                    {isDone && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                            <h4 className="text-xl font-semibold text-gray-900">Success!</h4>
                            <p className="text-gray-600">Certificates generated and downloaded.</p>
                            <button
                                onClick={() => {
                                    setIsDone(false);
                                    setIsGenerating(false);
                                }}
                                className="text-blue-600 hover:underline text-sm"
                            >
                                Generate New Batch
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2 transition-colors"
                >
                    ← Back
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Final Review</h2>
                <div className="w-16"></div> {/* Spacer for centering */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Summary & Download */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex justify-between">
                                <span>Total Recipients:</span>
                                <span className="font-medium text-gray-900">{data.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mapped Name:</span>
                                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{mapping.name}</span>
                            </div>
                            {mapping.email ? (
                                <div className="flex justify-between">
                                    <span>mapped Email:</span>
                                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{mapping.email}</span>
                                </div>
                            ) : (
                                <p className="text-amber-600 text-xs">No email column mapped.</p>
                            )}
                        </div>
                    </div>

                    {/* Email Toggle */}
                    {mapping.email && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Email Certificates</h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={showEmailConfig}
                                        onChange={(e) => setShowEmailConfig(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {showEmailConfig && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                                        <input
                                            type="text"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                                        <textarea
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Recipient List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Recipients</h3>
                        {showEmailConfig && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{selectedIndices.size} selected</span>
                                <button
                                    onClick={toggleAll}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    {selectedIndices.size === data.length ? "Deselect All" : "Select All"}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1 p-0">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {showEmailConfig && <th className="px-4 py-2 w-10"></th>}
                                    <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                                    <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        {showEmailConfig && (
                                            <td className="px-4 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndices.has(i)}
                                                    onChange={() => toggleRecipient(i)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-gray-900 font-medium">{row[mapping.name]}</td>
                                        <td className="px-4 py-3 text-gray-500 break-all">{mapping.email ? row[mapping.email] : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-8">
                <button
                    onClick={generateCertificates}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                    <Download className="w-6 h-6" />
                    {showEmailConfig ? `Generate & Send (${selectedIndices.size})` : "Generate & Download Zip"}
                </button>
            </div>
        </div>
    );
}
