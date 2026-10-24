"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, PlugZap } from "lucide-react";
import { verifySmtp } from "@/actions/email";
import { detectProvider, isSmtpComplete, SMTP_PROVIDERS, type SMTPConfig } from "@/lib/smtp";
import { Button, Field, Input, Select, Switch } from "@/components/ui";

const STORAGE_KEY = "certify:smtp";

export const EMPTY_SMTP: SMTPConfig = { host: "", port: 587, user: "", pass: "", fromName: "", fromEmail: "", replyTo: "" };

interface Stored {
    config: SMTPConfig;
    rememberPassword: boolean;
}

/** SMTP config state with opt-in persistence to this browser's localStorage. */
export function useSmtpConfig() {
    const [config, setConfig] = useState<SMTPConfig>(EMPTY_SMTP);
    const [remember, setRemember] = useState(false);
    const [rememberPassword, setRememberPassword] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const stored = JSON.parse(raw) as Stored;
                // Hydrate from localStorage after mount; reading it during render would mismatch the server HTML.
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setConfig({ ...EMPTY_SMTP, ...stored.config });
                setRemember(true);
                setRememberPassword(Boolean(stored.rememberPassword));
            }
        } catch {
            // Storage unavailable or corrupted; start fresh.
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        try {
            if (remember) {
                const toStore: Stored = {
                    config: { ...config, pass: rememberPassword ? config.pass : "" },
                    rememberPassword,
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // Ignore storage failures.
        }
    }, [config, remember, rememberPassword, loaded]);

    return { config, setConfig, remember, setRemember, rememberPassword, setRememberPassword };
}

type SmtpState = ReturnType<typeof useSmtpConfig>;

export function SmtpSettings({ state }: { state: SmtpState }) {
    const { config, setConfig, remember, setRemember, rememberPassword, setRememberPassword } = state;
    const [provider, setProvider] = useState("custom");
    const [showPass, setShowPass] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

    useEffect(() => {
        setProvider(detectProvider(config.host));
    }, [config.host]);

    const update = (patch: Partial<SMTPConfig>) => {
        setConfig((c) => ({ ...c, ...patch }));
        setTestResult(null);
    };

    const selectProvider = (id: string) => {
        setProvider(id);
        const p = SMTP_PROVIDERS.find((x) => x.id === id);
        if (p && p.id !== "custom") update({ host: p.host, port: p.port });
    };

    const test = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            setTestResult(await verifySmtp(config));
        } catch {
            setTestResult({ ok: false, error: "The server didn't respond. Try again." });
        } finally {
            setTesting(false);
        }
    };

    const providerInfo = SMTP_PROVIDERS.find((p) => p.id === provider);

    return (
        <div className="space-y-4">
            <Field label="Email provider" hint={providerInfo?.help}>
                {(id) => (
                    <Select id={id} value={provider} onChange={(e) => selectProvider(e.target.value)}>
                        {SMTP_PROVIDERS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </Select>
                )}
            </Field>

            <div className="grid grid-cols-[1fr_96px] gap-3">
                <Field label="SMTP host">
                    {(id) => <Input id={id} value={config.host} placeholder="smtp.example.com" onChange={(e) => update({ host: e.target.value })} autoComplete="off" />}
                </Field>
                <Field label="Port">
                    {(id) => (
                        <Input id={id} type="number" inputMode="numeric" value={config.port || ""} placeholder="587" onChange={(e) => update({ port: Number(e.target.value) })} />
                    )}
                </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Username">
                    {(id) => <Input id={id} value={config.user} placeholder="you@example.com" onChange={(e) => update({ user: e.target.value })} autoComplete="username" />}
                </Field>
                <Field label="Password">
                    {(id) => (
                        <div className="relative">
                            <Input
                                id={id}
                                type={showPass ? "text" : "password"}
                                value={config.pass}
                                placeholder="App password"
                                onChange={(e) => update({ pass: e.target.value })}
                                autoComplete="current-password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass((s) => !s)}
                                aria-label={showPass ? "Hide password" : "Show password"}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
                <Field label="From name" hint="Shown as the sender, e.g. your event name.">
                    {(id) => <Input id={id} value={config.fromName ?? ""} placeholder="DevFest Raipur" onChange={(e) => update({ fromName: e.target.value })} />}
                </Field>
                <Field label="From address" hint="Leave empty to use the username.">
                    {(id) => <Input id={id} type="email" value={config.fromEmail ?? ""} placeholder={config.user || "you@example.com"} onChange={(e) => update({ fromEmail: e.target.value })} />}
                </Field>
            </div>

            <Field label="Reply-to (optional)" hint="Where replies go. Separate multiple addresses with commas.">
                {(id) => <Input id={id} value={config.replyTo ?? ""} placeholder="team@example.com" onChange={(e) => update({ replyTo: e.target.value })} />}
            </Field>

            <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="secondary" size="sm" onClick={test} loading={testing} disabled={!isSmtpComplete(config)}>
                    {!testing && <PlugZap className="w-4 h-4" />}
                    Test connection
                </Button>
                {testResult?.ok && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-success">
                        <CheckCircle2 className="w-4 h-4" /> Connected
                    </span>
                )}
                {testResult && !testResult.ok && <span className="text-sm text-danger">{testResult.error}</span>}
            </div>

            <div className="rounded-xl bg-muted/60 p-3 space-y-3">
                <label className="flex items-center justify-between gap-3 text-sm">
                    <span>
                        <span className="font-medium text-foreground">Remember on this device</span>
                        <span className="block text-xs text-muted-foreground">Saved in this browser only, never on our server.</span>
                    </span>
                    <Switch checked={remember} onChange={setRemember} label="Remember SMTP settings" />
                </label>
                {remember && (
                    <label className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground">Also remember password</span>
                        <Switch checked={rememberPassword} onChange={setRememberPassword} label="Remember password" />
                    </label>
                )}
            </div>
        </div>
    );
}
