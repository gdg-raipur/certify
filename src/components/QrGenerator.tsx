"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, QrCode, RotateCcw } from "lucide-react";
import { Alert, Button, Card, CardBody, Field, PageHeader, Select, Textarea } from "@/components/ui";
import { downloadBlob } from "@/lib/csv";
import { generateQRDataUrl, generateQRSvg, type ErrorCorrection } from "@/lib/qr";

const SIZES = [256, 512, 1024, 2048];

const LEVELS: { id: ErrorCorrection; label: string }[] = [
    { id: "L", label: "Low (7%)" },
    { id: "M", label: "Medium (15%)" },
    { id: "Q", label: "Quartile (25%)" },
    { id: "H", label: "High (30%)" },
];

const DEFAULTS = { size: 1024, dark: "#000000", light: "#ffffff", level: "M" as ErrorCorrection, margin: 2 };

/** Relative luminance contrast ratio between two hex colors. */
function contrast(a: string, b: string): number {
    const lum = (hex: string) => {
        const n = parseInt(hex.replace("#", ""), 16);
        const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
}

export function QrGenerator() {
    const [text, setText] = useState("");
    const [size, setSize] = useState(DEFAULTS.size);
    const [dark, setDark] = useState(DEFAULTS.dark);
    const [light, setLight] = useState(DEFAULTS.light);
    const [level, setLevel] = useState<ErrorCorrection>(DEFAULTS.level);
    const [margin, setMargin] = useState(DEFAULTS.margin);
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const value = text.trim();
    const opts = { width: size, dark, light, errorCorrectionLevel: level, margin };

    useEffect(() => {
        if (!value) return;
        let cancelled = false;
        const t = setTimeout(() => {
            generateQRDataUrl(value, { width: size, dark, light, errorCorrectionLevel: level, margin })
                .then((url) => {
                    if (cancelled) return;
                    setDataUrl(url);
                    setError(null);
                })
                .catch(() => {
                    if (cancelled) return;
                    setDataUrl(null);
                    setError("That's too much content for a QR code. Shorten it or lower the error correction.");
                });
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [value, size, dark, light, level, margin]);

    const downloadPng = async () => {
        if (!dataUrl) return;
        downloadBlob(await (await fetch(dataUrl)).blob(), "qrcode.png");
    };

    const downloadSvg = async () => {
        const svg = await generateQRSvg(value, opts);
        downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
    };

    const copyImage = async () => {
        if (!dataUrl) return;
        try {
            const blob = await (await fetch(dataUrl)).blob();
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setError("Your browser blocked copying images. Use Download instead.");
        }
    };

    const reset = () => {
        setSize(DEFAULTS.size);
        setDark(DEFAULTS.dark);
        setLight(DEFAULTS.light);
        setLevel(DEFAULTS.level);
        setMargin(DEFAULTS.margin);
    };

    const lowContrast = contrast(dark, light) < 3;
    const shownUrl = value ? dataUrl : null;
    const shownError = value ? error : null;

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <PageHeader icon={<QrCode />} title="QR Codes" description="Turn any link or text into a QR code. It updates as you type." />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
                <Card>
                    <CardBody className="space-y-5">
                        <Field label="Content" hint={`${value.length} characters. Shorter content makes a simpler, easier-to-scan code.`}>
                            {(id) => (
                                <Textarea
                                    id={id}
                                    rows={4}
                                    autoFocus
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="https://your-event.com/register"
                                    className="font-mono text-[13px]"
                                />
                            )}
                        </Field>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Size">
                                {(id) => (
                                    <Select id={id} value={size} onChange={(e) => setSize(Number(e.target.value))}>
                                        {SIZES.map((s) => (
                                            <option key={s} value={s}>
                                                {s} × {s} px
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                            <Field label="Error correction" hint="Higher survives damage or a logo overlay, but adds density.">
                                {(id) => (
                                    <Select id={id} value={level} onChange={(e) => setLevel(e.target.value as ErrorCorrection)}>
                                        {LEVELS.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.label}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <ColorField label="Foreground" value={dark} onChange={setDark} />
                            <ColorField label="Background" value={light} onChange={setLight} />
                            <Field label="Quiet zone" className="col-span-2 sm:col-span-1">
                                {(id) => (
                                    <Select id={id} value={margin} onChange={(e) => setMargin(Number(e.target.value))}>
                                        {[0, 1, 2, 4].map((m) => (
                                            <option key={m} value={m}>
                                                {m === 0 ? "None" : `${m} module${m > 1 ? "s" : ""}`}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </Field>
                        </div>

                        {lowContrast && <Alert tone="warning">These colors are low-contrast; many phones won&apos;t be able to scan the code.</Alert>}

                        <Button variant="ghost" size="sm" onClick={reset}>
                            <RotateCcw className="w-4 h-4" /> Reset style
                        </Button>
                    </CardBody>
                </Card>

                <Card className="lg:sticky lg:top-20">
                    <CardBody className="space-y-5">
                        <div className="aspect-square rounded-xl bg-checker flex items-center justify-center p-6">
                            {shownUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={shownUrl} alt="Generated QR code" className="w-full h-full object-contain shadow-sm [image-rendering:pixelated]" />
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <QrCode className="w-12 h-12 mx-auto opacity-40" />
                                    <p className="mt-3 text-sm">Your QR code will appear here</p>
                                </div>
                            )}
                        </div>
                        {shownError && <p className="text-sm text-danger">{shownError}</p>}
                        <div className="grid grid-cols-2 gap-2">
                            <Button onClick={downloadPng} disabled={!shownUrl}>
                                <Download className="w-4 h-4" /> PNG
                            </Button>
                            <Button variant="secondary" onClick={downloadSvg} disabled={!shownUrl}>
                                <Download className="w-4 h-4" /> SVG
                            </Button>
                            <Button variant="ghost" className="col-span-2" onClick={copyImage} disabled={!shownUrl}>
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied" : "Copy image"}
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </main>
    );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <Field label={label}>
            {(id) => (
                <label
                    htmlFor={id}
                    className="flex items-center gap-2 h-10 rounded-lg border border-border bg-surface px-2 cursor-pointer hover:border-border-strong"
                >
                    <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded cursor-pointer bg-transparent" />
                    <span className="font-mono text-xs text-muted-foreground uppercase">{value}</span>
                </label>
            )}
        </Field>
    );
}
