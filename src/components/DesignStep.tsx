"use client";

import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesignConfig {
    templateUrl: string;
    templateDimensions: { width: number; height: number };
    namePos: { x: number; y: number; fontSize: number; color: string };
    qrPos: { x: number; y: number; size: number };
    idPos: { x: number; y: number; fontSize: number; color: string };
}

interface DesignStepProps {
    onDesignComplete: (config: DesignConfig) => void;
    onBack: () => void;
}

export function DesignStep({ onDesignComplete, onBack }: DesignStepProps) {
    const [template, setTemplate] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Default positions (will be adjusted based on image size)
    const [namePos, setNamePos] = useState({ x: 50, y: 50, fontSize: 40, color: "#000000" });
    const [qrPos, setQrPos] = useState({ x: 80, y: 80, size: 100 });
    const [idPos, setIdPos] = useState({ x: 50, y: 90, fontSize: 12, color: "#666666" });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                setDimensions({ width: img.width, height: img.height });
                // Set reasonable defaults based on image size
                setNamePos({ ...namePos, x: img.width / 2, y: img.height / 2 });
                setQrPos({ ...qrPos, x: img.width - 150, y: img.height - 150 });
                setIdPos({ ...idPos, x: img.width / 2, y: img.height - 50 });
                setTemplate(url);
            };
            img.src = url;
        }
    };

    const handleNext = () => {
        if (template) {
            onDesignComplete({
                templateUrl: template,
                templateDimensions: dimensions,
                namePos,
                qrPos,
                idPos,
            });
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">Template</h3>
                        <div className="space-y-4">
                            <div
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                onClick={() => document.getElementById("template-upload")?.click()}
                            >
                                <input
                                    id="template-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-600">Upload Certificate Image</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {template && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                            <h3 className="text-lg font-semibold">Configuration</h3>

                            <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">Name Position</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">X</label>
                                        <input
                                            type="number"
                                            value={namePos.x}
                                            onChange={(e) => setNamePos({ ...namePos, x: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Y</label>
                                        <input
                                            type="number"
                                            value={namePos.y}
                                            onChange={(e) => setNamePos({ ...namePos, y: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500">Font Size</label>
                                        <input
                                            type="number"
                                            value={namePos.fontSize}
                                            onChange={(e) => setNamePos({ ...namePos, fontSize: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-sm text-gray-700 mb-2">QR Code</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">X</label>
                                        <input
                                            type="number"
                                            value={qrPos.x}
                                            onChange={(e) => setQrPos({ ...qrPos, x: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Y</label>
                                        <input
                                            type="number"
                                            value={qrPos.y}
                                            onChange={(e) => setQrPos({ ...qrPos, y: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-gray-500">Size</label>
                                        <input
                                            type="number"
                                            value={qrPos.size}
                                            onChange={(e) => setQrPos({ ...qrPos, size: Number(e.target.value) })}
                                            className="w-full p-1 border rounded"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="md:col-span-2">
                    <div className="bg-gray-100 rounded-xl p-4 min-h-[400px] flex items-center justify-center overflow-hidden border border-gray-200">
                        {template ? (
                            <div
                                className="relative shadow-lg"
                                style={{
                                    width: '100%',
                                    maxWidth: '100%',
                                    containerType: 'inline-size'
                                }}
                            >
                                {/* We use an img tag for the template, and absolute positioning for overlays */}
                                <img src={template} alt="Template" className="w-full h-auto block" />

                                {/* Name Overlay */}
                                <div
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
                                    style={{
                                        left: `${(namePos.x / dimensions.width) * 100}%`,
                                        top: `${(namePos.y / dimensions.height) * 100}%`,
                                        fontSize: `${(namePos.fontSize / dimensions.width) * 100}cqw`,
                                        color: namePos.color,
                                    }}
                                >
                                    <span className="font-bold">John Doe</span>
                                </div>

                                {/* QR Overlay */}
                                <div
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-gray-200 flex items-center justify-center pointer-events-none"
                                    style={{
                                        left: `${(qrPos.x / dimensions.width) * 100}%`,
                                        top: `${(qrPos.y / dimensions.height) * 100}%`,
                                        width: `${(qrPos.size / dimensions.width) * 100}%`,
                                        aspectRatio: '1/1',
                                    }}
                                >
                                    <span className="text-xs">QR</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400">
                                <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                <p>Upload a template to start designing</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={!template}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
