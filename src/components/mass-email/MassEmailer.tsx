"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FlaskConical, Mail, Pause, Play, RotateCcw, Send, Square, Users } from "lucide-react";
import { sendEmails } from "@/actions/email";
import { CsvDropzone } from "@/components/CsvDropzone";
import { EmailComposer, EmailPreview, renderEmail, type EmailDraft } from "@/components/EmailComposer";
import { SmtpSettings, useSmtpConfig } from "@/components/SmtpSettings";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Progress, Select, Switch } from "@/components/ui";
import { downloadBlob, guessEmailColumn, toCsv, type ParsedCsv } from "@/lib/csv";
import { isSmtpComplete } from "@/lib/smtp";
import { findEmptyPlaceholders } from "@/lib/template";
import { countDeliveries, useSendQueue } from "@/lib/useSendQueue";
import { cn, isValidEmail } from "@/lib/utils";

const DEFAULT_DRAFT: EmailDraft = {
    subject: "Thanks for joining us, {{name}}!",
    body: "Hi {{name}},\n\nThank you for being part of our event. We hope you had a great time!\n\nSee you at the next one,\nThe organizing team",
    isHtml: false,
};

type Filter = "all" | "pending" | "sent" | "failed";

export function MassEmailer() {
    const [csv, setCsv] = useState<(ParsedCsv & { fileName: string }) | null>(null);
    const [emailCol, setEmailCol] = useState("");
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [draft, setDraft] = useState<EmailDraft>(DEFAULT_DRAFT);
    const smtp = useSmtpConfig();
    const queue = useSendQueue();

    const [previewIndex, setPreviewIndex] = useState(0);
    const [batchSize, setBatchSize] = useState(3);
    const [delaySec, setDelaySec] = useState(1);
    const [confirming, setConfirming] = useState(false);
    const [testToInput, setTestTo] = useState<string | null>(null);
    const [testState, setTestState] = useState<{ busy?: boolean; ok?: boolean; error?: string }>({});
    const [filter, setFilter] = useState<Filter>("all");

    const rows = useMemo(() => csv?.rows ?? [], [csv]);
    const headers = csv?.headers ?? [];
    const testTo = testToInput ?? (smtp.config.fromEmail || smtp.config.user);

    const recipients = useMemo(() => {
        const seen = new Set<string>();
        return rows.map((row, index) => {
            const email = (row[emailCol] ?? "").trim();
            const valid = isValidEmail(email);
            const key = email.toLowerCase();
            const duplicate = valid && seen.has(key);
            if (valid) seen.add(key);
            return { index, row, email, valid, duplicate };
        });
    }, [rows, emailCol]);

    const sendable = recipients.filter((r) => r.valid && !(skipDuplicates && r.duplicate));
    // Recipients never attempted; failed and unconfirmed ones have their own retry actions.
    const remaining = sendable.filter((r) => !queue.deliveries[r.index]);
    const invalidCount = recipients.filter((r) => !r.valid).length;
    const duplicateCount = recipients.filter((r) => r.duplicate).length;
    const counts = countDeliveries(queue.deliveries);
    const attempted = counts.sent + counts.failed + counts.unknown;
    const totalInRun = attempted + counts.queued + counts.sending;

    const previewable = sendable.length > 0 ? sendable : recipients;
    const safePreview = Math.min(previewIndex, Math.max(0, previewable.length - 1));
    const preview = previewable[safePreview];
    const emptyInPreview = preview ? findEmptyPlaceholders(preview.row, draft.subject, draft.body) : [];

    const smtpReady = isSmtpComplete(smtp.config);
    const fromLabel = smtp.config.fromName
        ? `${smtp.config.fromName} <${smtp.config.fromEmail || smtp.config.user}>`
        : smtp.config.fromEmail || smtp.config.user;

    const blockers = [
        !csv && "Upload a CSV of recipients",
        csv && !emailCol && "Choose the email column",
        csv && emailCol && sendable.length === 0 && "No valid email addresses found",
        !draft.subject.trim() && "Add a subject",
        !draft.body.trim() && "Write a message",
        !smtpReady && "Fill in your SMTP details",
    ].filter(Boolean) as string[];

    useEffect(() => {
        if (!queue.running) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [queue.running]);

    const handleCsv = (parsed: ParsedCsv, fileName: string) => {
        setCsv({ ...parsed, fileName });
        setEmailCol(guessEmailColumn(parsed.headers));
        setPreviewIndex(0);
        setConfirming(false);
        queue.reset();
    };

    const build = (index: number) => {
        const r = recipients[index];
        return { to: r.email, ...renderEmail(draft, r.row) };
    };

    const startSend = (indices: number[]) => {
        setConfirming(false);
        queue.run(indices, build, smtp.config, { batchSize, delayMs: delaySec * 1000 });
    };

    const sendTest = async () => {
        if (!preview || !isValidEmail(testTo)) return;
        setTestState({ busy: true });
        try {
            const message = build(preview.index);
            const [result] = await sendEmails(smtp.config, [{ ...message, to: testTo, subject: `[Test] ${message.subject}` }]);
            setTestState(result.ok ? { ok: true } : { error: result.error });
        } catch {
            setTestState({ error: "The server didn't respond. Try again." });
        }
    };

    const exportResults = () => {
        const out = recipients.map((r) => {
            const d = queue.deliveries[r.index];
            const status = !r.valid ? "invalid email" : r.duplicate && skipDuplicates ? "duplicate (skipped)" : d?.state ?? "not sent";
            return { ...r.row, delivery_status: status, delivery_error: d?.error ?? "" };
        });
        downloadBlob(new Blob([toCsv(out, [...headers, "delivery_status", "delivery_error"])], { type: "text/csv" }), "mass-email-results.csv");
    };

    const failedIndices = recipients.filter((r) => queue.deliveries[r.index]?.state === "failed").map((r) => r.index);
    const unknownIndices = recipients.filter((r) => queue.deliveries[r.index]?.state === "unknown").map((r) => r.index);

    const tableRows = recipients.filter((r) => {
        const s = queue.deliveries[r.index]?.state;
        if (filter === "sent") return s === "sent";
        if (filter === "failed") return s === "failed" || s === "unknown" || !r.valid;
        if (filter === "pending") return r.valid && !(skipDuplicates && r.duplicate) && s !== "sent";
        return true;
    });

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <PageHeader
                icon={<Mail />}
                title="Mass Email"
                description="Send a personalized email to everyone in a spreadsheet, straight from your own inbox. Every CSV column becomes a {{placeholder}}."
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
                <div className="space-y-6 min-w-0">
                    {/* Recipients */}
                    <Card>
                        <CardHeader icon={<Users />} title="1. Recipients" description="A CSV with a header row and at least an email column." />
                        <CardBody className="space-y-4">
                            <CsvDropzone
                                fileName={csv?.fileName}
                                rowCount={rows.length}
                                onLoaded={handleCsv}
                                onClear={() => {
                                    setCsv(null);
                                    queue.reset();
                                }}
                                hint={
                                    <>
                                        Example columns: <span className="font-mono">name, email, ticket_type</span>
                                    </>
                                }
                            />
                            {csv && (
                                <div className="grid sm:grid-cols-2 gap-4 items-end">
                                    <Field label="Email column">
                                        {(id) => (
                                            <Select id={id} value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                                                <option value="">Select a column…</option>
                                                {headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </Select>
                                        )}
                                    </Field>
                                    <label className="flex items-center justify-between gap-3 h-10 rounded-lg border border-border px-3 text-sm">
                                        <span className="text-foreground">Skip duplicate addresses</span>
                                        <Switch checked={skipDuplicates} onChange={setSkipDuplicates} label="Skip duplicates" />
                                    </label>
                                </div>
                            )}
                            {csv && emailCol && (
                                <div className="flex flex-wrap gap-2">
                                    <Badge tone="success">{sendable.length} will receive the email</Badge>
                                    {invalidCount > 0 && <Badge tone="danger">{invalidCount} missing or invalid</Badge>}
                                    {duplicateCount > 0 && <Badge tone="warning">{duplicateCount} duplicates{skipDuplicates ? " skipped" : ""}</Badge>}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {/* Message */}
                    <Card>
                        <CardHeader icon={<Mail />} title="2. Message" description="Write once; placeholders are filled in for each person." />
                        <CardBody>
                            <EmailComposer draft={draft} onChange={setDraft} variables={headers} />
                        </CardBody>
                    </Card>

                    {/* Sender */}
                    <Card>
                        <CardHeader
                            icon={<Send />}
                            title="3. Sender"
                            description="Your SMTP credentials are used only to send these emails and are never stored on the server."
                        />
                        <CardBody>
                            <SmtpSettings state={smtp} />
                        </CardBody>
                    </Card>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6 lg:sticky lg:top-20">
                    <Card>
                        <CardHeader
                            title="Preview"
                            description={preview ? `Recipient ${safePreview + 1} of ${previewable.length}` : "Upload a CSV to preview"}
                            action={
                                preview && (
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" aria-label="Previous recipient" disabled={safePreview === 0} onClick={() => setPreviewIndex(safePreview - 1)}>
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            aria-label="Next recipient"
                                            disabled={safePreview >= previewable.length - 1}
                                            onClick={() => setPreviewIndex(safePreview + 1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )
                            }
                        />
                        <CardBody className="space-y-3">
                            <EmailPreview draft={draft} row={preview?.row ?? {}} to={preview?.email ?? ""} from={fromLabel || undefined} />
                            {emptyInPreview.length > 0 && (
                                <p className="text-xs text-warning">
                                    This recipient has no value for {emptyInPreview.map((p) => `{{${p}}}`).join(", ")}.
                                </p>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Send" />
                        <CardBody className="space-y-4">
                            {/* Test send */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">Send a test first</p>
                                <div className="flex gap-2">
                                    <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" aria-label="Test email address" />
                                    <Button
                                        variant="secondary"
                                        onClick={sendTest}
                                        loading={testState.busy}
                                        disabled={!preview || !smtpReady || !isValidEmail(testTo) || queue.running}
                                    >
                                        {!testState.busy && <FlaskConical className="w-4 h-4" />}
                                        Test
                                    </Button>
                                </div>
                                {testState.ok && <p className="text-xs text-success">Test sent to {testTo}. Check your inbox (and spam).</p>}
                                {testState.error && <p className="text-xs text-danger">{testState.error}</p>}
                            </div>

                            <details className="group rounded-lg border border-border">
                                <summary className="cursor-pointer select-none px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Sending speed</summary>
                                <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                                    <Field label="Per batch">
                                        {(id) => (
                                            <Input id={id} type="number" min={1} max={10} value={batchSize} onChange={(e) => setBatchSize(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
                                        )}
                                    </Field>
                                    <Field label="Pause (sec)">
                                        {(id) => <Input id={id} type="number" min={0} max={60} value={delaySec} onChange={(e) => setDelaySec(Math.max(0, Math.min(60, Number(e.target.value) || 0)))} />}
                                    </Field>
                                    <p className="col-span-2 text-xs text-muted-foreground">
                                        Free Gmail allows about 500 emails a day. Slow down if your provider starts rejecting messages.
                                    </p>
                                </div>
                            </details>

                            {totalInRun > 0 && (
                                <div className="space-y-2">
                                    <Progress value={totalInRun ? (attempted / totalInRun) * 100 : 0} />
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <Badge tone="success">{counts.sent} sent</Badge>
                                        {counts.failed > 0 && <Badge tone="danger">{counts.failed} failed</Badge>}
                                        {counts.unknown > 0 && <Badge tone="warning">{counts.unknown} unconfirmed</Badge>}
                                        {(counts.queued > 0 || counts.sending > 0) && <Badge>{counts.queued + counts.sending} to go</Badge>}
                                    </div>
                                </div>
                            )}

                            {queue.running ? (
                                <div className="flex gap-2">
                                    {queue.paused ? (
                                        <Button className="flex-1" onClick={queue.resume}>
                                            <Play className="w-4 h-4" /> Resume
                                        </Button>
                                    ) : (
                                        <Button className="flex-1" variant="secondary" onClick={queue.pause}>
                                            <Pause className="w-4 h-4" /> Pause
                                        </Button>
                                    )}
                                    <Button variant="danger" onClick={queue.stop}>
                                        <Square className="w-4 h-4" /> Stop
                                    </Button>
                                </div>
                            ) : confirming ? (
                                <div className="space-y-3 rounded-xl bg-accent-soft p-3">
                                    <p className="text-sm text-foreground">
                                        Send <strong>{remaining.length}</strong> email{remaining.length === 1 ? "" : "s"} from <strong>{fromLabel}</strong>?
                                    </p>
                                    <div className="flex gap-2">
                                        <Button className="flex-1" onClick={() => startSend(remaining.map((r) => r.index))}>
                                            <Send className="w-4 h-4" /> Yes, send now
                                        </Button>
                                        <Button variant="secondary" onClick={() => setConfirming(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button size="lg" className="w-full" disabled={blockers.length > 0 || remaining.length === 0} onClick={() => setConfirming(true)}>
                                    <Send className="w-4 h-4" />
                                    {attempted > 0
                                        ? remaining.length > 0
                                            ? `Send to remaining ${remaining.length}`
                                            : "Everyone has been emailed"
                                        : sendable.length > 0
                                          ? `Send to ${sendable.length} recipient${sendable.length === 1 ? "" : "s"}`
                                          : "Send emails"}
                                </Button>
                            )}

                            {!queue.running && failedIndices.length > 0 && (
                                <Button variant="secondary" className="w-full" onClick={() => startSend(failedIndices)}>
                                    <RotateCcw className="w-4 h-4" /> Retry {failedIndices.length} failed
                                </Button>
                            )}
                            {!queue.running && unknownIndices.length > 0 && (
                                <Alert tone="warning" title={`${unknownIndices.length} unconfirmed`}>
                                    The server stopped responding mid-batch, so these may have been delivered.{" "}
                                    <button type="button" className="underline font-medium" onClick={() => startSend(unknownIndices)}>
                                        Resend anyway
                                    </button>
                                </Alert>
                            )}

                            {blockers.length > 0 && !queue.running && (
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    {blockers.map((b) => (
                                        <li key={b} className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </aside>
            </div>

            {/* Delivery table */}
            {csv && emailCol && (
                <Card className="mt-6 overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
                        <div className="inline-flex rounded-lg bg-muted p-0.5 text-sm font-medium">
                            {(["all", "pending", "sent", "failed"] as Filter[]).map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilter(f)}
                                    className={cn(
                                        "px-3 py-1 rounded-md capitalize transition-colors",
                                        filter === f ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <Button variant="secondary" size="sm" onClick={exportResults}>
                            <Download className="w-4 h-4" /> Export results
                        </Button>
                    </div>
                    <div className="max-h-[480px] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-5 py-2.5 font-medium w-12">#</th>
                                    <th className="px-5 py-2.5 font-medium">Email</th>
                                    <th className="px-5 py-2.5 font-medium hidden sm:table-cell">Subject</th>
                                    <th className="px-5 py-2.5 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {tableRows.map((r) => {
                                    const d = queue.deliveries[r.index];
                                    return (
                                        <tr key={r.index} className="hover:bg-muted/40 cursor-pointer" onClick={() => {
                                            const pi = previewable.findIndex((p) => p.index === r.index);
                                            if (pi !== -1) setPreviewIndex(pi);
                                        }}>
                                            <td className="px-5 py-2.5 text-muted-foreground tabular-nums">{r.index + 1}</td>
                                            <td className="px-5 py-2.5 text-foreground break-all">{r.email || <span className="text-muted-foreground">(empty)</span>}</td>
                                            <td className="px-5 py-2.5 text-muted-foreground hidden sm:table-cell truncate max-w-xs">{renderEmail(draft, r.row).subject}</td>
                                            <td className="px-5 py-2.5 text-right">
                                                {!r.valid ? (
                                                    <Badge tone="danger">Invalid email</Badge>
                                                ) : r.duplicate && skipDuplicates ? (
                                                    <Badge tone="warning">Duplicate</Badge>
                                                ) : (
                                                    <DeliveryBadge delivery={d} />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tableRows.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                                            Nothing here.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </main>
    );
}
