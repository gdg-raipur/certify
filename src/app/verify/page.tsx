"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getCertificate, CertificateRecord } from "@/actions/certificates";
import { ShieldCheck, Calendar, User, Search, Loader2, Link as IconLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from 'react';

// Separate component for search params logic
function VerifyContent() {
    const searchParams = useSearchParams();
    const idParam = searchParams.get("id");

    const [inputId, setInputId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (idParam) {
            setInputId(idParam);
            handleVerify(idParam);
        }
    }, [idParam]);

    const handleVerify = async (idToVerify: string) => {
        if (!idToVerify) return;
        setIsLoading(true);
        setError(null);
        setCertificate(null);

        try {
            const cert = await getCertificate(idToVerify);
            if (cert) {
                setCertificate(cert);
            } else {
                setError("Certificate not found. Please check the ID and try again.");
            }
        } catch (err) {
            console.error("Verification error", err);
            setError("An error occurred while verifying. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-4 grid-rows-[auto_auto_auto] md:grid-rows-[minmax(180px,auto)_minmax(180px,auto)] gap-6">

            {/* Header / Back Button */}
            <div className="md:col-span-4 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium px-4 py-2 rounded-xl hover:bg-white/50"
                >
                    <ShieldCheck className="w-5 h-5" />
                    Back to Home
                </Link>
                <div className="flex items-center gap-2 px-4 py-2 bg-violet-100/50 rounded-full text-violet-700 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    Verification Portal
                </div>
            </div>

            {/* Main Input Box */}
            <div className={`md:col-span-2 ${certificate ? 'md:row-span-1' : 'md:row-span-2'} bg-violet-100 rounded-3xl p-8 flex flex-col justify-center shadow-sm`}>
                <h1 className="text-3xl font-bold text-violet-900 mb-6">Verify Certificate</h1>
                <div className="space-y-4">
                    <div>
                        <label className="text-violet-800/80 font-medium ml-1">Certificate ID</label>
                        <div className="relative mt-1">
                            <input
                                type="text"
                                value={inputId}
                                onChange={(e) => setInputId(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-violet-900 placeholder:text-violet-300 bg-white/80 backdrop-blur-sm"
                                placeholder="Enter ID..."
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                        </div>
                    </div>
                    <button
                        onClick={() => handleVerify(inputId)}
                        disabled={isLoading || !inputId}
                        className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Now"}
                    </button>
                </div>
                {error && (
                    <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200 flex gap-2 items-start animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            {/* Result Box (Only shows when verified) */}
            {certificate ? (
                <div className="md:col-span-2 md:row-span-2 bg-emerald-50 rounded-3xl p-8 flex flex-col justify-between shadow-sm border border-emerald-100 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-emerald-900">Valid Certificate</h2>
                            <p className="text-emerald-700">Issued by {certificate.issuer}</p>
                        </div>
                    </div>

                    <div className="space-y-4 bg-white/60 px-6 py-4 rounded-2xl border border-emerald-100 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Recipient</p>
                                <p className="text-lg font-semibold text-emerald-900">{certificate.name}</p>
                            </div>
                        </div>
                        <div className="h-px bg-emerald-200/50 w-full" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <Calendar className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Issue Date</p>
                                <p className="text-lg font-semibold text-emerald-900">{formatDate(certificate.issuedAt)}</p>
                            </div>
                        </div>
                        <div className="h-px bg-emerald-200/50 w-full" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                <IconLink className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Certificate ID</p>
                                <p className="text-sm font-mono text-emerald-900 truncate">{certificate.id}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-2 text-center">
                        <p className="text-sm text-emerald-700/70">Verification successful. This certificate is authentic.</p>
                    </div>
                </div>
            ) : (
                /* Empty/Decorative State when minimal results */
                <>
                    {/* Decorative Box 1 */}
                    <div className="bg-sky-100 rounded-3xl p-6 flex items-center justify-center aspect-square md:aspect-auto">
                        <div className="w-12 h-12 rounded-full border-4 border-sky-200"></div>
                    </div>
                    {/* Decorative Box 2 */}
                    <div className="bg-amber-100 rounded-3xl p-6 md:col-start-4 md:row-start-2">
                        <div className="w-full h-full border-2 border-dashed border-amber-300/50 rounded-2xl"></div>
                    </div>
                    {/* Decorative Box 3 */}
                    <div className="bg-rose-100 rounded-3xl p-6 md:col-span-1 md:col-start-3 md:row-start-2">
                        <div className="w-8 h-8 bg-rose-300/50 rounded-full mb-auto"></div>
                    </div>
                </>
            )}

        </div>
    );
}

export default function VerifyPage() {
    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center font-sans">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </main>
    );
}