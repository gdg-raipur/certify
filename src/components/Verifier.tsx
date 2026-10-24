"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, CalendarDays, Hash, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles, User } from "lucide-react";
import { verifyCertificate, type VerifyResult } from "@/actions/certificates";
import { Button, Card, Input } from "@/components/ui";
import { formatIssueDate } from "@/lib/certificate/helpers";

/** Accepts a bare ID, a signed token, or a full verification URL. */
function parseQuery(input: string): { id?: string; token?: string } {
    const value = input.trim();
    if (!value) return {};
    try {
        const url = new URL(value);
        const c = url.searchParams.get("c");
        const id = url.searchParams.get("id");
        if (c) return { token: c };
        if (id) return { id };
    } catch {
        // Not a URL.
    }
    if (value.includes(".") && value.length > 40) return { token: value };
    return { id: value };
}

export function Verifier() {
    const params = useSearchParams();
    const router = useRouter();
    const idParam = params.get("id");
    const tokenParam = params.get("c");

    const [input, setInput] = useState(idParam ?? "");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<VerifyResult | null>(null);

    const run = useCallback(async (query: { id?: string; token?: string }) => {
        if (!query.id && !query.token) return;
        setLoading(true);
        setResult(null);
        try {
            setResult(await verifyCertificate(query));
        } catch {
            setResult({ status: "unavailable", message: "Something went wrong while verifying. Please try again." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (idParam || tokenParam) {
            if (idParam) setInput(idParam);
            run({ id: idParam ?? undefined, token: tokenParam ?? undefined });
        }
    }, [idParam, tokenParam, run]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = parseQuery(input);
        if (q.id) router.replace(`/verify?id=${encodeURIComponent(q.id)}`, { scroll: false });
        else if (q.token) router.replace(`/verify?c=${encodeURIComponent(q.token)}`, { scroll: false });
    };

    const fromLink = Boolean(idParam || tokenParam);

    return (
        <main className="relative">
            <div className="absolute inset-x-0 top-0 h-80 bg-dots opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
            <div className="relative mx-auto max-w-2xl px-4 sm:px-6 py-14 sm:py-20">
                {!fromLink && (
                    <div className="text-center mb-8">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">Verify a certificate</h1>
                        <p className="mt-2 text-muted-foreground">Scan the QR code on the certificate, or paste its ID or link below.</p>
                    </div>
                )}

                {loading && (
                    <Card className="p-10 text-center">
                        <div className="mx-auto w-10 h-10 rounded-full border-2 border-border border-t-accent animate-spin" />
                        <p className="mt-4 text-sm text-muted-foreground">Checking certificate…</p>
                    </Card>
                )}

                {!loading && result?.status === "valid" && <ValidResult result={result} />}

                {!loading && result && result.status !== "valid" && (
                    <Card className="p-6 sm:p-8 text-center animate-fade-up">
                        <div
                            className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
                                result.status === "unavailable" ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger"
                            }`}
                        >
                            {result.status === "unavailable" ? <ShieldQuestion className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                        </div>
                        <h2 className="mt-4 text-xl font-semibold text-foreground">
                            {result.status === "not_found" ? "Certificate not found" : result.status === "invalid" ? "Couldn't verify this certificate" : "Verification unavailable"}
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{result.message}</p>
                    </Card>
                )}

                <form onSubmit={submit} className={fromLink ? "mt-8" : ""}>
                    {fromLink && <p className="text-sm text-muted-foreground mb-2">Verify another certificate</p>}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Certificate ID or verification link"
                                className="h-12 pl-10 text-base"
                                aria-label="Certificate ID or verification link"
                            />
                        </div>
                        <Button type="submit" size="lg" disabled={!input.trim() || loading}>
                            Verify
                        </Button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function ValidResult({ result }: { result: Extract<VerifyResult, { status: "valid" }> }) {
    const { certificate: cert, source } = result;
    return (
        <Card className="overflow-hidden animate-fade-up">
            <div className="bg-success-soft px-6 sm:px-8 py-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-success text-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm font-medium text-success">Verified certificate</p>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{cert.name}</h1>
                </div>
            </div>
            <dl className="divide-y divide-border">
                {cert.event && <Detail icon={<Sparkles />} label="Event" value={cert.event} />}
                {cert.issuer && <Detail icon={<User />} label="Issued by" value={cert.issuer} />}
                <Detail icon={<CalendarDays />} label="Issue date" value={formatIssueDate(cert.issuedAt.slice(0, 10))} />
                <Detail icon={<Hash />} label="Certificate ID" value={<code className="font-mono text-sm break-all">{cert.id}</code>} />
            </dl>
            <p className="px-6 sm:px-8 py-4 text-xs text-muted-foreground bg-muted/40 border-t border-border">
                {source === "registry"
                    ? "This certificate is recorded in this site's registry."
                    : "This certificate's details carry a digital signature from this site and haven't been altered."}{" "}
                Event and issuer names are provided by whoever created the certificate.
            </p>
        </Card>
    );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-4 px-6 sm:px-8 py-4">
            <span className="mt-0.5 text-muted-foreground [&>svg]:w-4 [&>svg]:h-4">{icon}</span>
            <dt className="w-28 shrink-0 text-sm text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground min-w-0">{value}</dd>
        </div>
    );
}
