"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Lock, LogOut, Search, ShieldCheck } from "lucide-react";
import { getAllCertificates, type CertificateRecord } from "@/actions/certificates";
import { Alert, Button, Card, CardBody, Field, Input, PageHeader } from "@/components/ui";
import { downloadBlob, toCsv } from "@/lib/csv";
import { formatIssueDate } from "@/lib/certificate/helpers";

export function AdminDashboard() {
    const [orgId, setOrgId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [certificates, setCertificates] = useState<CertificateRecord[] | null>(null);
    const [search, setSearch] = useState("");

    const login = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await getAllCertificates(orgId, password);
            if (res.ok) setCertificates(res.certificates);
            else setError(res.error);
        } catch {
            setError("Authentication failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setCertificates(null);
        setPassword("");
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!certificates || !q) return certificates ?? [];
        return certificates.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.id.toLowerCase().includes(q) ||
                c.event?.toLowerCase().includes(q) ||
                c.issuer?.toLowerCase().includes(q) ||
                c.recipientEmail?.toLowerCase().includes(q)
        );
    }, [certificates, search]);

    const events = useMemo(() => new Set(certificates?.map((c) => c.event || c.issuer)).size, [certificates]);

    if (!certificates) {
        return (
            <main className="mx-auto max-w-sm px-4 py-20">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Instance admin</h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        For the people running this Certify deployment. Everyone else can use every tool without logging in.
                    </p>
                </div>
                <Card>
                    <CardBody>
                        <form onSubmit={login} className="space-y-4">
                            <Field label="Organisation ID">
                                {(id) => <Input id={id} value={orgId} onChange={(e) => setOrgId(e.target.value)} required autoComplete="username" />}
                            </Field>
                            <Field label="Password">
                                {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />}
                            </Field>
                            {error && <Alert tone="danger">{error}</Alert>}
                            <Button type="submit" className="w-full" loading={loading}>
                                Sign in
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <PageHeader
                icon={<ShieldCheck />}
                title="Certificate registry"
                description={`Signed in as ${orgId}`}
                action={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadBlob(new Blob([toCsv(filtered as unknown as Record<string, string>[])], { type: "text/csv" }), "certificates.csv")}
                        >
                            <Download className="w-4 h-4" /> Export
                        </Button>
                        <Button variant="ghost" size="sm" onClick={logout}>
                            <LogOut className="w-4 h-4" /> Sign out
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Certificates</p>
                    <p className="text-3xl font-semibold tabular-nums text-foreground mt-1">{certificates.length}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Events / issuers</p>
                    <p className="text-3xl font-semibold tabular-nums text-foreground mt-1">{events}</p>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-border">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ID, event…" className="pl-9" aria-label="Search" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                            <tr>
                                <th className="px-5 py-3 font-medium">Recipient</th>
                                <th className="px-5 py-3 font-medium">Event</th>
                                <th className="px-5 py-3 font-medium">ID</th>
                                <th className="px-5 py-3 font-medium">Issued</th>
                                <th className="px-5 py-3 font-medium text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.slice(0, 1000).map((c) => (
                                <tr key={c.id} className="hover:bg-muted/40">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-foreground">{c.name}</p>
                                        {c.recipientEmail && <p className="text-xs text-muted-foreground">{c.recipientEmail}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground">
                                        {c.event || "—"}
                                        <span className="block text-xs">{c.issuer}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <code className="font-mono text-xs text-muted-foreground">{c.id}</code>
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{formatIssueDate(c.issuedAt.slice(0, 10))}</td>
                                    <td className="px-5 py-3 text-right">
                                        <a href={c.verifyLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                                            Verify <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                                        No certificates match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 1000 && (
                    <p className="px-5 py-3 text-xs text-muted-foreground border-t border-border">Showing the first 1,000 of {filtered.length}. Export to see all.</p>
                )}
            </Card>
        </main>
    );
}
