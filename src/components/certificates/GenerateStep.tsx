"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { ArrowLeft, Download, ExternalLink, FileArchive, FileDown, Mail, RotateCcw, ShieldCheck, Sparkles, Users } from "lucide-react";
import { getCapabilities, issueCertificates, type Capabilities } from "@/actions/certificates";
import { DeliveryBadge } from "@/components/DeliveryBadge";
import { EmailComposer, EmailPreview, renderEmail, type EmailDraft } from "@/components/EmailComposer";
import { SmtpSettings, useSmtpConfig } from "@/components/SmtpSettings";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Progress, Select, Switch } from "@/components/ui";
import { downloadBlob, toCsv } from "@/lib/csv";
import { buildVariables, formatBytes, generateCertificateId, safeFilename, uint8ToBase64 } from "@/lib/certificate/helpers";
import { CertificateRenderer } from "@/lib/certificate/render";
import { BUILTIN_VARIABLES, type CertificateDetails, type Design, type QrLayer } from "@/lib/certificate/types";
import { isSmtpComplete } from "@/lib/smtp";
import { renderTemplate } from "@/lib/template";
import { countDeliveries, useSendQueue } from "@/lib/useSendQueue";
import { cn, isValidEmail } from "@/lib/utils";
import type { CsvState } from "./CertificateWizard";

interface GenerateStepProps {
    csv: NonNullable<CsvState>;
    nameCol: string;
    emailCol: string;
    setEmailCol: (c: string) => void;
    details: CertificateDetails;
    design: Design;
    onBack: () => void;
}

type Phase = "idle" | "issuing" | "rendering" | "zipping" | "sending" | "done";

interface Generated {
    id: string;
    verifyLink: string;
    filename: string;
    bytes: Uint8Array;
}

/** Larger attachments exceed serverless request limits (Vercel caps bodies at 4.5 MB, and base64 adds a third). */
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ISSUE_CHUNK = 500;

export function GenerateStep({ csv, nameCol, emailCol, setEmailCol, details, design, onBack }: GenerateStepProps) {
    const rows = csv.rows;
    const [caps, setCaps] = useState<Capabilities | null>(null);
    const [verifiable, setVerifiable] = useState(true);
    const [selected, setSelected] = useState<Set<number>>(() => new Set(rows.map((_, i) => i)));
    const [zipEnabled, setZipEnabled] = useState(true);
    const [filenameTemplate, setFilenameTemplate] = useState(`{{${nameCol}}} - {{certificate_id}}`);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [draft, setDraft] = useState<EmailDraft>({
        subject: "Your certificate for {{event}}",
        body: `Hi {{${nameCol}}},\n\nThank you for being part of {{event}}! Your certificate is attached to this email.\n\nAnyone can verify it here: {{verify_link}}\n\nCheers,\n{{issuer}}`,
        isHtml: false,
    });
    const smtp = useSmtpConfig();
    const queue = useSendQueue();

    const [phase, setPhase] = useState<Phase>("idle");
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [runError, setRunError] = useState<string | null>(null);
    const [renderErrors, setRenderErrors] = useState<Record<number, string>>({});
    const [confirming, setConfirming] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [issueMode, setIssueMode] = useState<"registry" | "signed" | null>(null);
    const results = useRef(new Map<number, Generated>());
    const zipBlob = useRef<Blob | null>(null);
    const [, forceRender] = useState(0);

    useEffect(() => {
        getCapabilities()
            .then(setCaps)
            .catch(() => setCaps({ registry: false, signing: false }));
    }, []);

    useEffect(() => {
        if (phase === "idle" || phase === "done") return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [phase]);

    const verificationAvailable = Boolean(caps && (caps.registry || caps.signing));
    const willVerify = verifiable && verificationAvailable;
    const qrLayer = design.layers.find((l): l is QrLayer => l.type === "qr");
    const indices = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
    const variables = [...csv.headers, ...BUILTIN_VARIABLES, "verify_link"].filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
    const missingNames = indices.filter((i) => !rows[i][nameCol]?.trim()).length;
    const emailable = emailCol ? indices.filter((i) => isValidEmail(rows[i][emailCol] ?? "")) : [];
    const smtpReady = isSmtpComplete(smtp.config);
    const fromLabel = smtp.config.fromName ? `${smtp.config.fromName} <${smtp.config.fromEmail || smtp.config.user}>` : smtp.config.fromEmail || smtp.config.user;

    const previewRowIndex = indices[Math.min(previewIndex, indices.length - 1)] ?? 0;
    const previewVars = buildVariables(rows[previewRowIndex] ?? {}, details, "Ab3dE5gH7jK9", willVerify ? `${typeof window !== "undefined" ? window.location.origin : ""}/verify?id=Ab3dE5gH7jK9` : "");

    const blockers = [
        indices.length === 0 && "Select at least one recipient",
        !zipEnabled && !emailEnabled && "Turn on download or email",
        emailEnabled && !emailCol && "Choose the email column",
        emailEnabled && emailable.length === 0 && emailCol && "No valid email addresses among selected rows",
        emailEnabled && !smtpReady && "Fill in your SMTP details",
        emailEnabled && !draft.subject.trim() && "Add an email subject",
    ].filter(Boolean) as string[];

    const toggle = (i: number) =>
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(i)) n.delete(i);
            else n.add(i);
            return n;
        });

    const buildEmail = (i: number) => {
        const g = results.current.get(i);
        if (!g) return "No certificate was generated for this row";
        const to = (rows[i][emailCol] ?? "").trim();
        if (!isValidEmail(to)) return "Invalid email address";
        if (g.bytes.length > MAX_ATTACHMENT_BYTES) {
            return `The PDF is ${formatBytes(g.bytes.length)}, too large to email (max 3 MB). Use a compressed JPG template.`;
        }
        const vars = buildVariables(rows[i], details, g.id, g.verifyLink);
        return {
            to,
            ...renderEmail(draft, vars),
            attachments: [{ filename: g.filename, contentBase64: uint8ToBase64(g.bytes), contentType: "application/pdf" }],
        };
    };

    const sendEmailsFor = (targets: number[]) => {
        const largest = Math.max(0, ...targets.map((i) => results.current.get(i)?.bytes.length ?? 0));
        const batchSize = largest < 700 * 1024 ? 3 : 1;
        return queue.run(targets, buildEmail, smtp.config, { batchSize, delayMs: 500 });
    };

    const generate = async () => {
        setConfirming(false);
        setRunError(null);
        setRenderErrors({});
        queue.reset();
        results.current = new Map();
        zipBlob.current = null;

        const targets = indices.filter((i) => rows[i][nameCol]?.trim());
        const ids = new Map(targets.map((i) => [i, generateCertificateId()]));
        const skipped: Record<number, string> = {};
        for (const i of indices) if (!ids.has(i)) skipped[i] = "Missing recipient name";
        setRenderErrors(skipped);

        // 1. Register certificates so their QR codes resolve.
        let links: Record<string, string> = {};
        setIssueMode(null);
        if (willVerify) {
            setPhase("issuing");
            setProgress({ done: 0, total: targets.length });
            for (let k = 0; k < targets.length; k += ISSUE_CHUNK) {
                const chunk = targets.slice(k, k + ISSUE_CHUNK);
                try {
                    const res = await issueCertificates(
                        chunk.map((i) => ({ id: ids.get(i)!, name: rows[i][nameCol]!, event: details.event, issuer: details.issuer, issuedOn: details.issuedOn })),
                        window.location.origin
                    );
                    if (!res.ok) throw new Error(res.error);
                    links = { ...links, ...res.links };
                    setIssueMode(res.mode);
                } catch (e) {
                    setRunError(`Couldn't register certificates for verification: ${(e as Error).message}`);
                    setPhase("idle");
                    return;
                }
                setProgress({ done: Math.min(targets.length, k + ISSUE_CHUNK), total: targets.length });
            }
        }

        // 2. Render PDFs in the browser.
        setPhase("rendering");
        setProgress({ done: 0, total: targets.length });
        let renderer: CertificateRenderer;
        try {
            renderer = await CertificateRenderer.create(design);
        } catch (e) {
            setRunError((e as Error).message);
            setPhase("idle");
            return;
        }
        const usedNames = new Set<string>();
        for (let k = 0; k < targets.length; k++) {
            const i = targets[k];
            const id = ids.get(i)!;
            const verifyLink = links[id] ?? "";
            const vars = buildVariables(rows[i], details, id, verifyLink);
            const qrText = qrLayer ? (qrLayer.source === "verify" ? verifyLink || null : rows[i][qrLayer.source]?.trim() || null) : null;
            try {
                const bytes = await renderer.render(vars, qrText, `${details.event || "Certificate"} - ${rows[i][nameCol]}`);
                const base = safeFilename(renderTemplate(filenameTemplate, vars));
                let filename = `${base}.pdf`;
                for (let n = 2; usedNames.has(filename.toLowerCase()); n++) filename = `${base} (${n}).pdf`;
                usedNames.add(filename.toLowerCase());
                results.current.set(i, { id, verifyLink, filename, bytes });
            } catch (e) {
                setRenderErrors((prev) => ({ ...prev, [i]: (e as Error).message }));
            }
            setProgress({ done: k + 1, total: targets.length });
            if (k % 5 === 4) await new Promise((r) => setTimeout(r, 0));
        }

        // 3. Zip for download.
        if (zipEnabled && results.current.size > 0) {
            setPhase("zipping");
            await buildZip();
            downloadZip();
        }

        // 4. Email.
        if (emailEnabled && emailCol) {
            setPhase("sending");
            await sendEmailsFor(targets.filter((i) => results.current.has(i)));
        }

        setPhase("done");
        forceRender((n) => n + 1);
    };

    const buildZip = async () => {
        const zip = new JSZip();
        for (const g of results.current.values()) zip.file(g.filename, g.bytes);
        zipBlob.current = await zip.generateAsync({ type: "blob", compression: "STORE" });
    };

    const downloadZip = () => {
        if (zipBlob.current) downloadBlob(zipBlob.current, `${safeFilename(details.event || "certificates")}.zip`);
    };

    const downloadRecords = () => {
        const out = indices.map((i) => {
            const g = results.current.get(i);
            const d = queue.deliveries[i];
            return {
                name: rows[i][nameCol] ?? "",
                email: emailCol ? (rows[i][emailCol] ?? "") : "",
                certificate_id: g?.id ?? "",
                verify_link: g?.verifyLink ?? "",
                file: g?.filename ?? "",
                pdf_status: g ? "generated" : `failed: ${renderErrors[i] ?? "unknown"}`,
                email_status: d?.state ?? (emailEnabled ? "not sent" : ""),
                email_error: d?.error ?? "",
            };
        });
        downloadBlob(new Blob([toCsv(out)], { type: "text/csv" }), `${safeFilename(details.event || "certificates")} - records.csv`);
    };

    const downloadOne = (i: number) => {
        const g = results.current.get(i);
        if (g) downloadBlob(new Blob([g.bytes as BlobPart], { type: "application/pdf" }), g.filename);
    };

    const counts = countDeliveries(queue.deliveries);
    const failedEmails = indices.filter((i) => queue.deliveries[i]?.state === "failed" && results.current.has(i));
    const unknownEmails = indices.filter((i) => queue.deliveries[i]?.state === "unknown");
    const renderFailures = Object.keys(renderErrors).length;

    // ---------- Running / results view ----------
    if (phase !== "idle") {
        const running = phase !== "done" || queue.running;
        const phaseLabel: Record<Phase, string> = {
            idle: "",
            issuing: "Registering certificates for verification…",
            rendering: `Generating PDFs… ${progress.done} of ${progress.total}`,
            zipping: "Packing ZIP file…",
            sending: `Sending emails… ${counts.sent + counts.failed + counts.unknown} of ${Object.keys(queue.deliveries).length}`,
            done: "All done",
        };
        const pct =
            phase === "sending"
                ? ((counts.sent + counts.failed + counts.unknown) / Math.max(1, Object.keys(queue.deliveries).length)) * 100
                : phase === "done"
                  ? 100
                  : (progress.done / Math.max(1, progress.total)) * 100;

        return (
            <div className="space-y-6">
                <Card>
                    <CardBody className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">{running ? phaseLabel[phase] : "Batch complete"}</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {running ? "Keep this tab open until it finishes." : "Download your files below. Nothing was uploaded except what's needed for verification and email."}
                                </p>
                            </div>
                            {queue.running && (
                                <div className="flex gap-2">
                                    {queue.paused ? (
                                        <Button size="sm" onClick={queue.resume}>
                                            Resume
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="secondary" onClick={queue.pause}>
                                            Pause
                                        </Button>
                                    )}
                                    <Button size="sm" variant="danger" onClick={queue.stop}>
                                        Stop
                                    </Button>
                                </div>
                            )}
                        </div>
                        <Progress value={pct} />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Stat label="Certificates" value={results.current.size} />
                            <Stat label="Failed to generate" value={renderFailures} tone={renderFailures ? "danger" : undefined} />
                            {emailEnabled && <Stat label="Emails sent" value={counts.sent} tone="success" />}
                            {emailEnabled && <Stat label="Emails failed" value={counts.failed + counts.unknown} tone={counts.failed + counts.unknown ? "danger" : undefined} />}
                        </div>
                        {issueMode && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                                {issueMode === "registry" ? "Saved to this instance's registry. QR codes link to the verification page." : "Signed verification links embedded in each QR code."}
                            </p>
                        )}
                        {!running && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {zipEnabled && results.current.size > 0 && (
                                    <Button onClick={downloadZip}>
                                        <FileArchive className="w-4 h-4" /> Download ZIP
                                    </Button>
                                )}
                                {!zipEnabled && results.current.size > 0 && (
                                    <Button
                                        variant="secondary"
                                        onClick={async () => {
                                            await buildZip();
                                            downloadZip();
                                        }}
                                    >
                                        <FileArchive className="w-4 h-4" /> Download ZIP
                                    </Button>
                                )}
                                <Button variant="secondary" onClick={downloadRecords}>
                                    <Download className="w-4 h-4" /> Records CSV
                                </Button>
                                {failedEmails.length > 0 && (
                                    <Button variant="secondary" onClick={() => sendEmailsFor(failedEmails)}>
                                        <RotateCcw className="w-4 h-4" /> Retry {failedEmails.length} failed emails
                                    </Button>
                                )}
                                <Button variant="ghost" onClick={() => setPhase("idle")}>
                                    <ArrowLeft className="w-4 h-4" /> Back to settings
                                </Button>
                            </div>
                        )}
                        {!queue.running && unknownEmails.length > 0 && (
                            <Alert tone="warning" title={`${unknownEmails.length} emails unconfirmed`}>
                                The server stopped responding mid-batch, so these may have been delivered.{" "}
                                <button type="button" className="underline font-medium" onClick={() => sendEmailsFor(unknownEmails)}>
                                    Resend anyway
                                </button>
                            </Alert>
                        )}
                    </CardBody>
                </Card>

                <Card className="overflow-hidden">
                    <div className="max-h-[560px] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-5 py-2.5 font-medium">Recipient</th>
                                    <th className="px-5 py-2.5 font-medium hidden md:table-cell">Certificate</th>
                                    <th className="px-5 py-2.5 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {indices.map((i) => {
                                    const g = results.current.get(i);
                                    const err = renderErrors[i];
                                    return (
                                        <tr key={i}>
                                            <td className="px-5 py-2.5">
                                                <p className="font-medium text-foreground">{rows[i][nameCol] || <span className="text-muted-foreground">(no name)</span>}</p>
                                                {emailCol && <p className="text-xs text-muted-foreground break-all">{rows[i][emailCol]}</p>}
                                            </td>
                                            <td className="px-5 py-2.5 hidden md:table-cell">
                                                {g ? (
                                                    <div className="flex items-center gap-2">
                                                        <code className="font-mono text-xs text-muted-foreground">{g.id}</code>
                                                        {g.verifyLink && (
                                                            <a href={g.verifyLink} target="_blank" rel="noreferrer" className="text-accent-text hover:underline inline-flex items-center gap-1 text-xs">
                                                                verify <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : err ? (
                                                    <span className="text-xs text-danger">{err}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-2.5">
                                                <div className="flex items-center justify-end gap-2">
                                                    {g && (
                                                        <Button variant="ghost" size="sm" aria-label="Download PDF" onClick={() => downloadOne(i)}>
                                                            <FileDown className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {err ? (
                                                        <Badge tone="danger">PDF failed</Badge>
                                                    ) : emailEnabled ? (
                                                        <DeliveryBadge delivery={queue.deliveries[i]} idleLabel={g ? "Not sent" : "Pending"} />
                                                    ) : g ? (
                                                        <Badge tone="success">Ready</Badge>
                                                    ) : (
                                                        <Badge>Pending</Badge>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    // ---------- Settings view ----------
    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
                <div className="space-y-6 min-w-0">
                    <Card>
                        <CardHeader
                            icon={<ShieldCheck />}
                            title="Verification"
                            description="Each certificate gets a unique ID. Its QR code opens a page confirming it's genuine."
                            action={verificationAvailable && <Switch checked={verifiable} onChange={setVerifiable} label="Make certificates verifiable" />}
                        />
                        <CardBody>
                            {!caps ? (
                                <p className="text-sm text-muted-foreground">Checking what this instance supports…</p>
                            ) : !verificationAvailable ? (
                                <Alert tone="warning" title="Verification isn't enabled on this instance">
                                    Certificates will still be generated, but without a working verification link
                                    {qrLayer?.source === "verify" ? ", so the QR code layer will be left off" : ""}. If you run this instance, set{" "}
                                    <code className="font-mono">CERTIFY_SECRET</code> to enable it.
                                </Alert>
                            ) : willVerify ? (
                                <p className="text-sm text-muted-foreground">
                                    {caps.registry
                                        ? "Certificates are saved to this instance's registry with the recipient's name, event, issuer and date. Email addresses aren't stored."
                                        : "Each QR code carries a signed link with the recipient's name, event, issuer and date, so nothing is stored on the server."}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Verification is off. QR codes set to the verification link will be left off.</p>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            icon={<FileArchive />}
                            title="Download as ZIP"
                            description="All PDFs in one archive, generated on your device."
                            action={<Switch checked={zipEnabled} onChange={setZipEnabled} label="Download ZIP" />}
                        />
                        <CardBody>
                            <Field label="File name" hint="Placeholders work here too. “.pdf” is added automatically.">
                                {(id) => <Input id={id} value={filenameTemplate} onChange={(e) => setFilenameTemplate(e.target.value)} className="font-mono text-[13px]" />}
                            </Field>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            icon={<Mail />}
                            title="Email certificates"
                            description="Send each person their certificate as a PDF attachment from your own inbox."
                            action={<Switch checked={emailEnabled} onChange={setEmailEnabled} label="Email certificates" />}
                        />
                        {emailEnabled && (
                            <CardBody className="space-y-6">
                                <Field label="Email column">
                                    {(id) => (
                                        <Select id={id} value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                                            <option value="">Select a column…</option>
                                            {csv.headers.map((h) => (
                                                <option key={h} value={h}>
                                                    {h}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                                <div className="border-t border-border pt-5">
                                    <EmailComposer draft={draft} onChange={setDraft} variables={variables} />
                                </div>
                                <div className="border-t border-border pt-5">
                                    <p className="text-sm font-semibold text-foreground mb-4">Sender</p>
                                    <SmtpSettings state={smtp} />
                                </div>
                            </CardBody>
                        )}
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader
                            icon={<Users />}
                            title="Recipients"
                            description={`${selected.size} of ${rows.length} selected`}
                            action={
                                <Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)))}>
                                    {selected.size === rows.length ? "Select none" : "Select all"}
                                </Button>
                            }
                            className="pb-4"
                        />
                        <div className="max-h-[420px] overflow-auto border-t border-border">
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-border">
                                    {rows.map((row, i) => (
                                        <tr key={i} className={cn("hover:bg-muted/40", !selected.has(i) && "opacity-50")}>
                                            <td className="pl-5 py-2 w-8">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(i)}
                                                    onChange={() => toggle(i)}
                                                    aria-label={`Include ${row[nameCol] || `row ${i + 1}`}`}
                                                    className="w-4 h-4 accent-[var(--accent)]"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-foreground font-medium">{row[nameCol] || <span className="text-danger font-normal">Missing name</span>}</td>
                                            {emailCol && (
                                                <td className="px-5 py-2 text-muted-foreground break-all text-right">
                                                    {row[emailCol] || "—"}
                                                    {row[emailCol] && !isValidEmail(row[emailCol]!) && <Badge tone="danger" className="ml-2">invalid</Badge>}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-20">
                    {emailEnabled && emailCol && indices.length > 0 && (
                        <Card>
                            <CardHeader title="Email preview" description={`For ${rows[previewRowIndex]?.[nameCol] || "recipient"}`} />
                            <CardBody>
                                <EmailPreview
                                    draft={draft}
                                    row={previewVars}
                                    to={rows[previewRowIndex]?.[emailCol] ?? ""}
                                    from={fromLabel || undefined}
                                    attachmentName={`${safeFilename(renderTemplate(filenameTemplate, previewVars))}.pdf`}
                                />
                                <div className="flex justify-end gap-1 mt-2">
                                    <Button variant="ghost" size="sm" disabled={previewIndex === 0} onClick={() => setPreviewIndex(previewIndex - 1)}>
                                        Previous
                                    </Button>
                                    <Button variant="ghost" size="sm" disabled={previewIndex >= indices.length - 1} onClick={() => setPreviewIndex(previewIndex + 1)}>
                                        Next
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}

                    <Card>
                        <CardHeader icon={<Sparkles />} title="Ready to generate" />
                        <CardBody className="space-y-4">
                            <dl className="text-sm space-y-2">
                                <SummaryRow label="Certificates" value={indices.length - missingNames} />
                                {missingNames > 0 && <SummaryRow label="Skipped (no name)" value={missingNames} tone="warning" />}
                                <SummaryRow label="Verification" value={willVerify ? (caps?.registry ? "Registry" : "Signed link") : "Off"} />
                                <SummaryRow label="Download" value={zipEnabled ? "ZIP" : "Off"} />
                                <SummaryRow label="Email" value={emailEnabled ? `${emailable.length} recipients` : "Off"} />
                            </dl>

                            {runError && <Alert tone="danger">{runError}</Alert>}

                            {confirming ? (
                                <div className="space-y-3 rounded-xl bg-accent-soft p-3">
                                    <p className="text-sm text-foreground">
                                        This will email <strong>{emailable.length}</strong> people from <strong>{fromLabel}</strong>. Continue?
                                    </p>
                                    <div className="flex gap-2">
                                        <Button className="flex-1" onClick={generate}>
                                            Yes, generate &amp; send
                                        </Button>
                                        <Button variant="secondary" onClick={() => setConfirming(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button size="lg" className="w-full" disabled={blockers.length > 0 || !caps} onClick={() => (emailEnabled ? setConfirming(true) : generate())}>
                                    {emailEnabled ? "Generate & send" : "Generate certificates"}
                                </Button>
                            )}

                            {blockers.length > 0 && (
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

            <div className="flex justify-start">
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" /> Back to design
                </Button>
            </div>
        </div>
    );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
    return (
        <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className={cn("text-2xl font-semibold tabular-nums", tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground")}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
    );
}

function SummaryRow({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warning" }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={cn("font-medium", tone === "warning" ? "text-warning" : "text-foreground")}>{value}</dd>
        </div>
    );
}
