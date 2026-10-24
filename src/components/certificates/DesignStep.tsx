"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    ImagePlus,
    Layers,
    Move,
    Plus,
    QrCode,
    Trash2,
    Type,
    Upload,
} from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Kbd, Select } from "@/components/ui";
import { buildVariables, cssFont, FONT_OPTIONS, measureText, uint8ToBase64 } from "@/lib/certificate/helpers";
import { BUILTIN_VARIABLES, type CertificateDetails, type Design, type Layer, type QrLayer, type TextLayer } from "@/lib/certificate/types";
import { generateQRDataUrl, qrModuleCount } from "@/lib/qr";
import { renderTemplate } from "@/lib/template";
import { cn } from "@/lib/utils";
import type { CsvState } from "./CertificateWizard";

interface DesignStepProps {
    csv: NonNullable<CsvState>;
    nameCol: string;
    details: CertificateDetails;
    design: Design;
    setDesign: React.Dispatch<React.SetStateAction<Design>>;
    onBack: () => void;
    onNext: () => void;
}

const SAMPLE_ID = "Ab3dE5gH7jK9";
const SNAP_THRESHOLD = 0.008;
const newId = () => Math.random().toString(36).slice(2, 10);

function defaultLayers(w: number, h: number, nameCol: string): Layer[] {
    return [
        {
            id: newId(),
            type: "text",
            content: nameCol ? `{{${nameCol}}}` : "{{name}}",
            x: Math.round(w / 2),
            y: Math.round(h * 0.5),
            fontSize: Math.round(w / 22),
            color: "#111827",
            font: "helvetica-bold",
            align: "center",
            maxWidth: Math.round(w * 0.7),
        },
        {
            id: newId(),
            type: "qr",
            x: Math.round(w - w * 0.1),
            y: Math.round(h - w * 0.1),
            size: Math.round(w * 0.14),
            source: "verify",
        },
        {
            id: newId(),
            type: "text",
            content: "ID: {{certificate_id}}",
            x: Math.round(w * 0.05),
            y: Math.round(h - h * 0.05),
            fontSize: Math.max(10, Math.round(w / 90)),
            color: "#6b7280",
            font: "helvetica",
            align: "left",
            maxWidth: 0,
        },
    ];
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Couldn't load that image."));
        img.src = url;
    });
}

function layerLabel(layer: Layer): string {
    if (layer.type === "qr") return "QR code";
    return layer.content.trim() || "Empty text";
}

export function DesignStep({ csv, nameCol, details, design, setDesign, onBack, onNext }: DesignStepProps) {
    const { template, layers, customFont } = design;
    const [selectedId, setSelectedId] = useState<string | null>(layers[0]?.id ?? null);
    const [rowIndex, setRowIndex] = useState(0);
    const [guides, setGuides] = useState({ v: false, h: false });
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const templateInput = useRef<HTMLInputElement>(null);
    const fontInput = useRef<HTMLInputElement>(null);
    const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number; ratio: number } | null>(null);

    const W = template?.width ?? 1;
    const H = template?.height ?? 1;
    const selected = layers.find((l) => l.id === selectedId) ?? null;
    const row = csv.rows[rowIndex] ?? {};
    const variables = [...csv.headers, ...BUILTIN_VARIABLES.filter((v) => !csv.headers.some((h) => h.toLowerCase() === v))];

    // A link of realistic length so the preview QR has the same density as the real one.
    const origin = typeof window !== "undefined" ? window.location.origin : "https://certify.example";
    const vars = buildVariables(row, details, SAMPLE_ID);
    const samplePayload = JSON.stringify({ i: SAMPLE_ID, n: row[nameCol] ?? "", e: details.event, o: details.issuer, d: details.issuedOn });
    const sampleVerifyLink = `${origin}/verify?c=${uint8ToBase64(new TextEncoder().encode(samplePayload)).replace(/=+$/, "")}.0123456789abcdefghijkl`;
    const qrLayer = layers.find((l): l is QrLayer => l.type === "qr");
    const qrText = qrLayer ? (qrLayer.source === "verify" ? sampleVerifyLink : (row[qrLayer.source] ?? "")) : "";

    useEffect(() => {
        let cancelled = false;
        if (!qrText) {
            setQrPreview(null);
            return;
        }
        generateQRDataUrl(qrText, { margin: 2, width: 320 })
            .then((url) => !cancelled && setQrPreview(url))
            .catch(() => !cancelled && setQrPreview(null));
        return () => {
            cancelled = true;
        };
    }, [qrText]);

    const longestRow = useMemo(() => {
        let best = 0;
        csv.rows.forEach((r, i) => {
            if ((r[nameCol]?.length ?? 0) > (csv.rows[best][nameCol]?.length ?? 0)) best = i;
        });
        return best;
    }, [csv.rows, nameCol]);

    const updateLayer = (id: string, patch: Partial<TextLayer> | Partial<QrLayer>) =>
        setDesign((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) }));

    const removeLayer = (id: string) => {
        setDesign((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) }));
        setSelectedId(null);
    };

    const addText = () => {
        const layer: TextLayer = {
            id: newId(),
            type: "text",
            content: "{{event}}",
            x: Math.round(W / 2),
            y: Math.round(H * 0.35),
            fontSize: Math.round(W / 40),
            color: "#374151",
            font: "helvetica",
            align: "center",
            maxWidth: 0,
        };
        setDesign((d) => ({ ...d, layers: [...d.layers, layer] }));
        setSelectedId(layer.id);
    };

    const addQr = () => {
        const layer: QrLayer = { id: newId(), type: "qr", x: Math.round(W - W * 0.1), y: Math.round(H - W * 0.1), size: Math.round(W * 0.14), source: "verify" };
        setDesign((d) => ({ ...d, layers: [...d.layers, layer] }));
        setSelectedId(layer.id);
    };

    const loadTemplate = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        if (!file.type.startsWith("image/")) {
            setError("Upload a PNG or JPG image of your certificate design.");
            return;
        }
        try {
            let bytes = await file.arrayBuffer();
            let url = URL.createObjectURL(file);
            const img = await loadImage(url);
            const head = new Uint8Array(bytes.slice(0, 4));
            let kind: "png" | "jpg" | null = head[0] === 0x89 && head[1] === 0x50 ? "png" : head[0] === 0xff && head[1] === 0xd8 ? "jpg" : null;
            if (!kind) {
                // Convert other formats (WebP, GIF…) to PNG, which pdf-lib can embed.
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d")!.drawImage(img, 0, 0);
                const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
                if (!blob) throw new Error("Couldn't convert that image.");
                bytes = await blob.arrayBuffer();
                URL.revokeObjectURL(url);
                url = URL.createObjectURL(blob);
                kind = "png";
            }
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            setDesign((d) => {
                let nextLayers = d.layers;
                if (!d.template || nextLayers.length === 0) {
                    nextLayers = defaultLayers(w, h, nameCol);
                } else if (d.template.width !== w || d.template.height !== h) {
                    const sx = w / d.template.width;
                    const sy = h / d.template.height;
                    nextLayers = nextLayers.map((l) =>
                        l.type === "text"
                            ? { ...l, x: Math.round(l.x * sx), y: Math.round(l.y * sy), fontSize: Math.round(l.fontSize * sx), maxWidth: Math.round(l.maxWidth * sx) }
                            : { ...l, x: Math.round(l.x * sx), y: Math.round(l.y * sy), size: Math.round(l.size * sx) }
                    );
                }
                return { ...d, template: { name: file.name, url, bytes, kind: kind!, width: w, height: h }, layers: nextLayers };
            });
            setSelectedId(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            if (templateInput.current) templateInput.current.value = "";
        }
    };

    const loadFont = async (file: File | undefined) => {
        if (!file) return;
        setError(null);
        try {
            const bytes = await file.arrayBuffer();
            const family = `CertifyCustom${Date.now()}`;
            const face = new FontFace(family, bytes);
            await face.load();
            document.fonts.add(face);
            setDesign((d) => ({ ...d, customFont: { name: file.name, bytes, family } }));
            if (selected?.type === "text") updateLayer(selected.id, { font: "custom" });
        } catch {
            setError("Couldn't load that font. Use a .ttf or .otf file.");
        } finally {
            if (fontInput.current) fontInput.current.value = "";
        }
    };

    // Dragging
    const onLayerPointerDown = (e: React.PointerEvent, layer: Layer) => {
        e.stopPropagation();
        setSelectedId(layer.id);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { id: layer.id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y, ratio: W / rect.width };
    };

    const onLayerPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        let x = d.origX + (e.clientX - d.startX) * d.ratio;
        let y = d.origY + (e.clientY - d.startY) * d.ratio;
        const snapV = Math.abs(x - W / 2) < W * SNAP_THRESHOLD;
        const snapH = Math.abs(y - H / 2) < H * SNAP_THRESHOLD;
        if (snapV) x = W / 2;
        if (snapH) y = H / 2;
        setGuides({ v: snapV, h: snapH });
        updateLayer(d.id, { x: Math.round(Math.max(0, Math.min(W, x))), y: Math.round(Math.max(0, Math.min(H, y))) });
    };

    const onLayerPointerUp = () => {
        drag.current = null;
        setGuides({ v: false, h: false });
    };

    const onCanvasKeyDown = (e: React.KeyboardEvent) => {
        if (!selected || e.target !== e.currentTarget) return;
        const step = e.shiftKey ? 10 : 1;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (moves[e.key]) {
            e.preventDefault();
            updateLayer(selected.id, { x: selected.x + moves[e.key][0], y: selected.y + moves[e.key][1] });
        } else if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            removeLayer(selected.id);
        } else if (e.key === "Escape") {
            setSelectedId(null);
        }
    };

    const qrPrintMm = qrLayer ? qrLayer.size * Math.min(1, 842 / Math.max(W, H)) * 0.3528 : 0;
    const qrModules = qrText ? qrModuleCount(qrText) : 0;

    if (!template) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardBody className="py-16">
                        <button
                            type="button"
                            onClick={() => templateInput.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                loadTemplate(e.dataTransfer.files[0]);
                            }}
                            className="mx-auto flex flex-col items-center text-center max-w-md group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-accent-soft text-accent-text flex items-center justify-center group-hover:scale-105 transition-transform">
                                <ImagePlus className="w-7 h-7" />
                            </div>
                            <h2 className="mt-5 text-lg font-semibold text-foreground">Upload your certificate design</h2>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                A PNG or JPG of the blank certificate, exported from Canva, Figma or similar. Leave space for the name. We&apos;ll place the text and QR
                                code on top.
                            </p>
                            <span className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-accent-foreground text-sm font-medium">
                                <Upload className="w-4 h-4" /> Choose image
                            </span>
                        </button>
                        <input ref={templateInput} type="file" accept="image/*" className="hidden" onChange={(e) => loadTemplate(e.target.files?.[0])} />
                        {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
                    </CardBody>
                </Card>
                <div className="flex justify-between">
                    <Button variant="secondary" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
                {/* Canvas */}
                <div className="space-y-3 min-w-0 lg:sticky lg:top-20">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <div className="flex items-center gap-1 text-sm">
                            <Button variant="ghost" size="sm" aria-label="Previous row" disabled={rowIndex === 0} onClick={() => setRowIndex(rowIndex - 1)}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-muted-foreground tabular-nums">
                                Row {rowIndex + 1} / {csv.rows.length}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Next row"
                                disabled={rowIndex >= csv.rows.length - 1}
                                onClick={() => setRowIndex(rowIndex + 1)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setRowIndex(longestRow)}>
                                Longest name
                            </Button>
                        </div>
                        <p className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Move className="w-3.5 h-3.5" /> Drag to move &middot; <Kbd>←↑→↓</Kbd> nudge &middot; <Kbd>Del</Kbd> remove
                        </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-checker p-3 sm:p-5">
                        <div
                            ref={canvasRef}
                            tabIndex={0}
                            onKeyDown={onCanvasKeyDown}
                            onPointerDown={() => setSelectedId(null)}
                            className="relative select-none touch-none shadow-lg outline-none mx-auto"
                            style={{ containerType: "inline-size" }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={template.url} alt="Certificate template" draggable={false} className="block w-full h-auto" />

                            {layers.map((layer) => {
                                const isSelected = layer.id === selectedId;
                                if (layer.type === "qr") {
                                    return (
                                        <div
                                            key={layer.id}
                                            onPointerDown={(e) => onLayerPointerDown(e, layer)}
                                            onPointerMove={onLayerPointerMove}
                                            onPointerUp={onLayerPointerUp}
                                            className={cn(
                                                "absolute -translate-x-1/2 -translate-y-1/2 cursor-move bg-white",
                                                isSelected ? "ring-2 ring-accent ring-offset-2" : "hover:ring-2 hover:ring-accent/40"
                                            )}
                                            style={{ left: `${(layer.x / W) * 100}%`, top: `${(layer.y / H) * 100}%`, width: `${(layer.size / W) * 100}%`, aspectRatio: "1" }}
                                        >
                                            {qrPreview ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={qrPreview} alt="QR preview" draggable={false} className="w-full h-full [image-rendering:pixelated]" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400">
                                                    <QrCode className="w-1/2 h-1/2" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                const text = renderTemplate(layer.content, vars).replace(/\s+/g, " ").trim();
                                const measured = measureText(text, layer.fontSize, layer.font, customFont?.family);
                                const fitted = layer.maxWidth > 0 && measured > layer.maxWidth ? (layer.fontSize * layer.maxWidth) / measured : layer.fontSize;
                                const tx = layer.align === "left" ? "0%" : layer.align === "right" ? "-100%" : "-50%";
                                const font = cssFont(layer.font, customFont?.family);
                                return (
                                    <div key={layer.id}>
                                        {isSelected && layer.maxWidth > 0 && (
                                            <div
                                                className="absolute border-x border-dashed border-accent/70 pointer-events-none -translate-y-1/2"
                                                style={{
                                                    left: `${((layer.align === "left" ? layer.x : layer.align === "right" ? layer.x - layer.maxWidth : layer.x - layer.maxWidth / 2) / W) * 100}%`,
                                                    top: `${(layer.y / H) * 100}%`,
                                                    width: `${(layer.maxWidth / W) * 100}%`,
                                                    height: `${(layer.fontSize / W) * 140}cqw`,
                                                }}
                                            />
                                        )}
                                        <div
                                            onPointerDown={(e) => onLayerPointerDown(e, layer)}
                                            onPointerMove={onLayerPointerMove}
                                            onPointerUp={onLayerPointerUp}
                                            className={cn(
                                                "absolute whitespace-nowrap cursor-move leading-none rounded-[2px]",
                                                isSelected ? "outline-2 outline-accent outline-offset-4" : "hover:outline-1 hover:outline-accent/50 hover:outline-offset-4"
                                            )}
                                            style={{
                                                left: `${(layer.x / W) * 100}%`,
                                                top: `${(layer.y / H) * 100}%`,
                                                transform: `translate(${tx}, -50%)`,
                                                fontSize: `${(fitted / W) * 100}cqw`,
                                                color: layer.color,
                                                fontFamily: font.fontFamily,
                                                fontWeight: font.fontWeight,
                                            }}
                                        >
                                            {text || <span className="opacity-40">{layer.content || "Empty"}</span>}
                                        </div>
                                    </div>
                                );
                            })}

                            {guides.v && <div className="absolute inset-y-0 left-1/2 w-px bg-pink-500 pointer-events-none" />}
                            {guides.h && <div className="absolute inset-x-0 top-1/2 h-px bg-pink-500 pointer-events-none" />}
                        </div>
                    </div>
                    {error && <Alert tone="danger">{error}</Alert>}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader
                            icon={<ImagePlus />}
                            title="Template"
                            description={`${template.name} · ${template.width} × ${template.height}px`}
                            action={
                                <Button variant="ghost" size="sm" onClick={() => templateInput.current?.click()}>
                                    Replace
                                </Button>
                            }
                            className="pb-5"
                        />
                        <input ref={templateInput} type="file" accept="image/*" className="hidden" onChange={(e) => loadTemplate(e.target.files?.[0])} />
                    </Card>

                    <Card>
                        <CardHeader icon={<Layers />} title="Layers" />
                        <CardBody className="space-y-2">
                            <ul className="space-y-1">
                                {layers.map((layer) => (
                                    <li key={layer.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(layer.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left transition-colors",
                                                layer.id === selectedId ? "bg-accent-soft text-accent-text" : "hover:bg-muted text-foreground"
                                            )}
                                        >
                                            {layer.type === "qr" ? <QrCode className="w-4 h-4 shrink-0" /> : <Type className="w-4 h-4 shrink-0" />}
                                            <span className="truncate font-mono text-xs">{layerLabel(layer)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-2 pt-1">
                                <Button variant="secondary" size="sm" className="flex-1" onClick={addText}>
                                    <Plus className="w-4 h-4" /> Text
                                </Button>
                                <Button variant="secondary" size="sm" className="flex-1" onClick={addQr} disabled={Boolean(qrLayer)}>
                                    <Plus className="w-4 h-4" /> QR code
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {selected?.type === "text" && (
                        <Card>
                            <CardHeader
                                icon={<Type />}
                                title="Text"
                                action={
                                    <Button variant="ghost" size="sm" aria-label="Delete layer" onClick={() => removeLayer(selected.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                }
                            />
                            <CardBody className="space-y-4">
                                <Field label="Content">
                                    {(id) => <Input id={id} value={selected.content} onChange={(e) => updateLayer(selected.id, { content: e.target.value })} className="font-mono text-[13px]" />}
                                </Field>
                                <div className="flex flex-wrap gap-1.5 -mt-2">
                                    {variables.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => updateLayer(selected.id, { content: `${selected.content}{{${v}}}` })}
                                            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-accent-text hover:border-accent"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Font">
                                        {(id) => (
                                            <Select
                                                id={id}
                                                value={selected.font}
                                                onChange={(e) => {
                                                    if (e.target.value === "__upload") fontInput.current?.click();
                                                    else updateLayer(selected.id, { font: e.target.value as TextLayer["font"] });
                                                }}
                                            >
                                                {FONT_OPTIONS.map((f) => (
                                                    <option key={f.id} value={f.id}>
                                                        {f.label}
                                                    </option>
                                                ))}
                                                {customFont && <option value="custom">{customFont.name}</option>}
                                                <option value="__upload">Upload font…</option>
                                            </Select>
                                        )}
                                    </Field>
                                    <Field label="Size">
                                        {(id) => (
                                            <Input id={id} type="number" min={4} value={selected.fontSize} onChange={(e) => updateLayer(selected.id, { fontSize: Math.max(4, Number(e.target.value) || 4) })} />
                                        )}
                                    </Field>
                                </div>
                                <input ref={fontInput} type="file" accept=".ttf,.otf" className="hidden" onChange={(e) => loadFont(e.target.files?.[0])} />

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Color">
                                        {(id) => (
                                            <div className="flex gap-2">
                                                <input
                                                    id={id}
                                                    type="color"
                                                    value={selected.color}
                                                    onChange={(e) => updateLayer(selected.id, { color: e.target.value })}
                                                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
                                                />
                                                <Input value={selected.color} onChange={(e) => updateLayer(selected.id, { color: e.target.value })} className="font-mono text-xs" aria-label="Hex color" />
                                            </div>
                                        )}
                                    </Field>
                                    <div className="space-y-1.5">
                                        <span className="block text-sm font-medium text-foreground">Align</span>
                                        <div className="grid grid-cols-3 rounded-lg bg-muted p-0.5 h-10">
                                            {(
                                                [
                                                    ["left", AlignLeft],
                                                    ["center", AlignCenter],
                                                    ["right", AlignRight],
                                                ] as const
                                            ).map(([a, Icon]) => (
                                                <button
                                                    key={a}
                                                    type="button"
                                                    aria-label={`Align ${a}`}
                                                    onClick={() => updateLayer(selected.id, { align: a })}
                                                    className={cn(
                                                        "flex items-center justify-center rounded-md transition-colors",
                                                        selected.align === a ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Field label="Shrink to fit width" hint="Long names get smaller instead of overflowing. 0 turns this off.">
                                    {(id) => (
                                        <Input id={id} type="number" min={0} value={selected.maxWidth} onChange={(e) => updateLayer(selected.id, { maxWidth: Math.max(0, Number(e.target.value) || 0) })} />
                                    )}
                                </Field>

                                <PositionFields x={selected.x} y={selected.y} onChange={(p) => updateLayer(selected.id, p)} onCenter={() => updateLayer(selected.id, { x: Math.round(W / 2), align: "center" })} />
                            </CardBody>
                        </Card>
                    )}

                    {selected?.type === "qr" && (
                        <Card>
                            <CardHeader
                                icon={<QrCode />}
                                title="QR code"
                                action={
                                    <Button variant="ghost" size="sm" aria-label="Delete layer" onClick={() => removeLayer(selected.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                }
                            />
                            <CardBody className="space-y-4">
                                <Field label="Encodes" hint={selected.source === "verify" ? "A link to this certificate's verification page." : "The value of this column for each row."}>
                                    {(id) => (
                                        <Select id={id} value={selected.source} onChange={(e) => updateLayer(selected.id, { source: e.target.value })}>
                                            <option value="verify">Verification link (recommended)</option>
                                            {csv.headers.map((h) => (
                                                <option key={h} value={h}>
                                                    Column: {h}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                                <Field label="Size (px)" hint={`Prints at about ${Math.round(qrPrintMm)} mm on A4 · ${qrModules}×${qrModules} modules`}>
                                    {(id) => (
                                        <Input id={id} type="number" min={40} value={selected.size} onChange={(e) => updateLayer(selected.id, { size: Math.max(40, Number(e.target.value) || 40) })} />
                                    )}
                                </Field>
                                {qrPrintMm > 0 && qrPrintMm < 22 && (
                                    <Alert tone="warning">This QR code may be too small to scan reliably when printed. Aim for at least 25 mm.</Alert>
                                )}
                                <PositionFields x={selected.x} y={selected.y} onChange={(p) => updateLayer(selected.id, p)} onCenter={() => updateLayer(selected.id, { x: Math.round(W / 2) })} />
                            </CardBody>
                        </Card>
                    )}

                    {!selected && (
                        <p className="text-sm text-muted-foreground text-center px-4 py-6 rounded-2xl border border-dashed border-border">
                            Select a layer on the certificate to edit it.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={onNext} disabled={layers.length === 0}>
                    Continue <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function PositionFields({ x, y, onChange, onCenter }: { x: number; y: number; onChange: (p: { x?: number; y?: number }) => void; onCenter: () => void }) {
    return (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Field label="X">{(id) => <Input id={id} type="number" value={x} onChange={(e) => onChange({ x: Number(e.target.value) || 0 })} />}</Field>
            <Field label="Y">{(id) => <Input id={id} type="number" value={y} onChange={(e) => onChange({ y: Number(e.target.value) || 0 })} />}</Field>
            <Button variant="secondary" onClick={onCenter} aria-label="Center horizontally" title="Center horizontally">
                <AlignCenter className="w-4 h-4" />
            </Button>
        </div>
    );
}
