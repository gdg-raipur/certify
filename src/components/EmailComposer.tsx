"use client";

import { useRef } from "react";
import { Braces } from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { findUnknownPlaceholders, renderTemplate, htmlToText, type Row } from "@/lib/template";

export interface EmailDraft {
    subject: string;
    body: string;
    isHtml: boolean;
}

interface EmailComposerProps {
    draft: EmailDraft;
    onChange: (draft: EmailDraft) => void;
    /** Placeholder keys available for insertion (CSV headers plus any extras). */
    variables: string[];
}

export function EmailComposer({ draft, onChange, variables }: EmailComposerProps) {
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);
    const lastFocused = useRef<"subject" | "body">("body");

    const insert = (key: string) => {
        const token = `{{${key}}}`;
        const target = lastFocused.current === "subject" ? subjectRef.current : bodyRef.current;
        const field = lastFocused.current;
        const value = draft[field];
        const start = target?.selectionStart ?? value.length;
        const end = target?.selectionEnd ?? value.length;
        const next = value.slice(0, start) + token + value.slice(end);
        onChange({ ...draft, [field]: next });
        requestAnimationFrame(() => {
            target?.focus();
            target?.setSelectionRange(start + token.length, start + token.length);
        });
    };

    // Only meaningful once there are columns to compare against.
    const unknown = variables.length > 0 ? findUnknownPlaceholders(variables, draft.subject, draft.body) : [];

    return (
        <div className="space-y-4">
            <Field label="Subject">
                {(id) => (
                    <Input
                        id={id}
                        ref={subjectRef}
                        value={draft.subject}
                        onFocus={() => (lastFocused.current = "subject")}
                        onChange={(e) => onChange({ ...draft, subject: e.target.value })}
                        placeholder="Thanks for joining us, {{name}}!"
                    />
                )}
            </Field>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                    <label htmlFor="email-body" className="text-sm font-medium text-foreground">
                        Message
                    </label>
                    <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium">
                        {(["Plain text", "HTML"] as const).map((label) => {
                            const active = (label === "HTML") === draft.isHtml;
                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => onChange({ ...draft, isHtml: label === "HTML" })}
                                    className={cn(
                                        "px-2.5 py-1 rounded-md transition-colors",
                                        active ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <Textarea
                    id="email-body"
                    ref={bodyRef}
                    rows={10}
                    value={draft.body}
                    onFocus={() => (lastFocused.current = "body")}
                    onChange={(e) => onChange({ ...draft, body: e.target.value })}
                    className={cn(draft.isHtml && "font-mono text-[13px]")}
                    placeholder={draft.isHtml ? "<p>Hi {{name}},</p>" : "Hi {{name}},\n\nThank you for attending…"}
                />
            </div>

            {variables.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Braces className="w-3.5 h-3.5" /> Click to insert a placeholder. Each one is replaced with that recipient&apos;s value.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {variables.map((v) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => insert(v)}
                                className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground hover:border-accent hover:text-accent-text transition-colors"
                            >
                                {`{{${v}}}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {unknown.length > 0 && (
                <p className="text-xs text-warning">
                    Unknown placeholder{unknown.length > 1 ? "s" : ""}: {unknown.map((u) => `{{${u}}}`).join(", ")}. These will be sent as-is.
                </p>
            )}
        </div>
    );
}

export function renderEmail(draft: EmailDraft, row: Row): { subject: string; text?: string; html?: string } {
    const subject = renderTemplate(draft.subject, row).replace(/\s+/g, " ").trim();
    if (draft.isHtml) {
        const html = renderTemplate(draft.body, row, { escape: true });
        return { subject, html, text: htmlToText(html) };
    }
    return { subject, text: renderTemplate(draft.body, row) };
}

interface EmailPreviewProps {
    draft: EmailDraft;
    row: Row;
    to: string;
    from?: string;
    attachmentName?: string;
}

export function EmailPreview({ draft, row, to, from, attachmentName }: EmailPreviewProps) {
    const rendered = renderEmail(draft, row);
    return (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <dl className="text-sm divide-y divide-border">
                {from && (
                    <div className="flex gap-3 px-4 py-2">
                        <dt className="w-14 shrink-0 text-muted-foreground">From</dt>
                        <dd className="text-foreground truncate">{from}</dd>
                    </div>
                )}
                <div className="flex gap-3 px-4 py-2">
                    <dt className="w-14 shrink-0 text-muted-foreground">To</dt>
                    <dd className="text-foreground truncate">{to || <span className="text-danger">No email</span>}</dd>
                </div>
                <div className="flex gap-3 px-4 py-2">
                    <dt className="w-14 shrink-0 text-muted-foreground">Subject</dt>
                    <dd className="text-foreground font-medium">{rendered.subject || <span className="text-muted-foreground font-normal">(no subject)</span>}</dd>
                </div>
            </dl>
            <div className="border-t border-border">
                {draft.isHtml ? (
                    <iframe
                        title="Email preview"
                        sandbox=""
                        srcDoc={`<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.55;color:#18181b;background:#fff;margin:16px;word-wrap:break-word}</style>${rendered.html ?? ""}`}
                        className="w-full h-72 bg-white"
                    />
                ) : (
                    <div className="px-4 py-4 text-sm text-foreground whitespace-pre-wrap break-words max-h-72 overflow-y-auto leading-relaxed">
                        {rendered.text || <span className="text-muted-foreground">Your message will appear here.</span>}
                    </div>
                )}
            </div>
            {attachmentName && (
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground truncate">📎 {attachmentName}</div>
            )}
        </div>
    );
}
