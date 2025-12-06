"use client";

import { generateQRCode } from "@/lib/qr";
import { useState } from "react";
import { QrCode, ArrowLeft, Loader2, Sparkles, Zap, Star } from "lucide-react";
import Link from "next/link";

export default function QRCodeGeneration() {
    const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [verifyLink, setVerifyLink] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateQRCode = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const qrImageBytes = await generateQRCode(verifyLink);
            const blob = new Blob([qrImageBytes], { type: "image/png" });
            const url = URL.createObjectURL(blob);
            setQrImageUrl(url);
        } catch (err) {
            console.error("QR Code Generation Error", err);
            setError("Failed to generate QR Code. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center font-sans">
            <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-4 grid-rows-[auto_auto_auto] md:grid-rows-[minmax(180px,auto)_minmax(180px,auto)] gap-6">

                {/* Header / Back Button */}
                <div className="md:col-span-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium px-4 py-2 rounded-xl hover:bg-white/50"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-100/50 rounded-full text-indigo-700 font-semibold text-sm">
                        <QrCode className="w-4 h-4" />
                        QR Generator
                    </div>
                </div>

                {/* Main Action Box: Input and Generate Button */}
                <div className="md:col-span-2 md:row-span-2 bg-indigo-100 rounded-3xl p-8 flex flex-col justify-center shadow-sm">
                    <h1 className="text-3xl font-bold text-indigo-900 mb-6">Generate QR Code</h1>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="url" className="text-indigo-800/80 font-medium ml-1">
                                Enter URL or Text
                            </label>
                            <input
                                id="url"
                                type="text"
                                value={verifyLink}
                                onChange={(e) => setVerifyLink(e.target.value)}
                                className="w-full p-4 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-indigo-900 placeholder:text-indigo-300 bg-white/80 backdrop-blur-sm"
                                placeholder="https://example.com"
                            />
                        </div>

                        <button
                            onClick={handleGenerateQRCode}
                            disabled={isGenerating || !verifyLink}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:translate-y-[-2px] active:translate-y-[0px] transition-all flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 fill-current" />
                                    Generate Now
                                </>
                            )}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200">
                            {error}
                        </div>
                    )}
                </div>

                {/* Result Box: The Generated QR Code */}
                <div className="bg-white md:col-span-2 md:row-span-2 rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm border border-slate-100 min-h-[300px]">
                    {qrImageUrl ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mb-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={qrImageUrl}
                                    alt="Generated QR Code"
                                    className="w-48 h-48 md:w-56 md:h-56 object-contain"
                                />
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={qrImageUrl}
                                    download="qrcode.png"
                                    className="px-6 py-2.5 bg-slate-900 text-slate-50 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-md"
                                >
                                    Download PNG
                                </a>
                                <button
                                    onClick={() => setQrImageUrl(null)}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400">
                            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                                <QrCode className="w-10 h-10 opacity-50" />
                            </div>
                            <p className="text-lg font-medium">No QR Code Generated</p>
                            <p className="text-sm opacity-75 max-w-[200px] mx-auto mt-1">
                                Enter a link and hit generate to see it here.
                            </p>
                        </div>
                    )}
                </div>

                {/* Decorative Box 1: Pastel Pink */}
                <div className="bg-rose-100 rounded-3xl p-6 flex items-center justify-center aspect-square md:aspect-auto group cursor-default hover:bg-rose-200 transition-colors shadow-sm">
                    <div className="text-rose-400 group-hover:text-rose-500 transition-colors">
                        <Sparkles className="w-12 h-12 opacity-80" />
                    </div>
                </div>

                {/* Decorative Box 2: Pastel Teal */}
                <div className="bg-teal-100 rounded-3xl p-6 flex flex-col justify-between group cursor-default hover:bg-teal-200 transition-colors shadow-sm max-md:hidden">
                    <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center">
                        <Star className="w-5 h-5 text-teal-700" />
                    </div>
                    <div className="h-10"></div>
                </div>

                {/* Decorative Box 3: Pastel Amber (Filling space if needed, or keeping it clean) */}
                <div className="bg-amber-100 rounded-3xl p-6 flex items-center justify-center md:col-span-1 group cursor-default hover:bg-amber-200 transition-colors shadow-sm max-md:hidden">
                    <div className="w-16 h-1 bg-amber-300/50 rounded-full"></div>
                </div>

                {/* Decorative Box 4: Pastel Sky */}
                <div className="bg-sky-100 rounded-3xl p-6 flex items-end justify-end group cursor-default hover:bg-sky-200 transition-colors shadow-sm">
                    <div className="w-8 h-8 rounded-full border-2 border-sky-300"></div>
                </div>

            </div>
        </main>
    );
}
