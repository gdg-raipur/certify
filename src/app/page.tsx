/*
* Home page (/) code base
*/

import Link from "next/link";
import { QrCode, CreditCard, FileText, LogIn, ShieldCheck } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-sky-50 p-4 sm:p-8 flex items-center justify-center font-sans">
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">

                {/* Main Box: Create Certificates */}
                <Link
                    href="/create-certificates"
                    className="md:col-span-2 md:row-span-2 bg-sky-200 hover:bg-sky-300 transition-all duration-300 rounded-3xl p-8 flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                    <div className="bg-white/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-8 h-8 text-sky-800" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-sky-900 mb-2">Create Certificates</h2>
                        <p className="text-sky-800/80 text-lg">
                            Bulk generate certificates with QR codes. Upload your CSV and customize your design in seconds.
                        </p>
                    </div>
                </Link>

                {/* Secondary Box: Create QR from Link */}
                <Link href="/qrcode-generation" className="bg-indigo-100 hover:bg-indigo-200 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md">
                    <div className="bg-white/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <QrCode className="w-6 h-6 text-indigo-800" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-indigo-900 mb-1">QR from Link</h3>
                        <p className="text-indigo-800/70 text-sm">Generate QR codes instantly.</p>
                    </div>
                </Link>

                {/* Secondary Box: Create ID Cards */}
                <div className="bg-teal-100 hover:bg-teal-200 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md">
                    <div className="bg-white/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <CreditCard className="w-6 h-6 text-teal-800" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-teal-900 mb-1">Create ID Cards</h3>
                        <p className="text-teal-800/70 text-sm">Design and print ID cards.</p>
                    </div>
                </div>

                {/* Secondary Box: Verify Certificates */}
                <Link href="/verify" className="bg-violet-100 hover:bg-violet-200 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md">
                    <div className="bg-white/30 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <ShieldCheck className="w-6 h-6 text-violet-800" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-violet-900 mb-1">Verify</h3>
                        <p className="text-violet-800/70 text-sm">Check certificate validity.</p>
                    </div>
                </Link>

                {/* Secondary Box: Login */}
                <Link href="/dashboard" className="bg-rose-100 hover:bg-rose-200 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between group cursor-pointer shadow-sm hover:shadow-md md:col-span-2 md:col-start-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-rose-900 mb-1">Login</h3>
                            <p className="text-rose-800/70 text-sm">Access your saved certificates.</p>
                        </div>
                        <div className="bg-white/30 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <LogIn className="w-6 h-6 text-rose-800" />
                        </div>
                    </div>
                </Link>

            </div>
        </main>
    );
}
