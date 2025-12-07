"use client";

import { useState } from "react";
import { getAllCertificates, CertificateRecord } from "@/actions/certificates";
import { login } from "@/actions/auth";
import { Lock, Search, ExternalLink, Mail, User, Calendar, ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [orgId, setOrgId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const success = await login(orgId, password);
            if (success) {
                const data = await getAllCertificates();
                setCertificates(data);
                setIsAuthenticated(true);
            } else {
                setError("Invalid Organisation ID or Password.");
            }
        } catch (err) {
            console.error(err);
            setError("Authentication failed. Please try again.");
        }
        setIsLoading(false);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setOrgId("");
        setPassword("");
        setCertificates([]);
    };

    const filteredCertificates = certificates.filter(cert =>
        cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.id.includes(searchTerm)
    );

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
                        <p className="text-gray-500 mt-2">Enter credentials to access dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Organisation ID</label>
                            <input
                                type="text"
                                value={orgId}
                                onChange={(e) => setOrgId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Enter Org ID"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Enter Password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium animate-in fade-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                        >
                            {isLoading ? "Verifying..." : "Access Dashboard"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Nav */}
            <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-xl text-gray-900">Certify Admin</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500 hidden sm:block">
                        Logged in as <span className="font-medium text-gray-900">{orgId}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-sm text-gray-500 font-medium mb-1">Total Certificates</div>
                        <div className="text-3xl font-bold text-gray-900">{certificates.length}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Certificate ID</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Issued</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCertificates.length > 0 ? (
                                    filteredCertificates.map((cert) => (
                                        <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 font-medium text-gray-900">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        {cert.name}
                                                    </div>
                                                    {cert.recipientEmail && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                            <Mail className="w-3 h-3 text-gray-400" />
                                                            {cert.recipientEmail}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                                                    {cert.id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(cert.issuedAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={cert.verifyLink}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                >
                                                    Verify
                                                    <ExternalLink className="w-3 h-3" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No certificates found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}