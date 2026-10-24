"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import { isCsvFile, parseCsv, type ParsedCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

interface CsvDropzoneProps {
    fileName?: string | null;
    rowCount?: number;
    onLoaded: (csv: ParsedCsv, fileName: string) => void;
    onClear?: () => void;
    hint?: React.ReactNode;
    className?: string;
}

export function CsvDropzone({ fileName, rowCount, onLoaded, onClear, hint, className }: CsvDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        if (!isCsvFile(file)) {
            setError("That doesn't look like a CSV file. Export your sheet as .csv and try again.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const parsed = await parseCsv(file);
            if (parsed.rows.length === 0) {
                setError("The CSV has headers but no rows.");
                return;
            }
            onLoaded(parsed, file.name);
        } catch (e) {
            setError("Couldn't read the CSV: " + (e as Error).message);
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    if (fileName) {
        return (
            <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3", className)}>
                <div className="w-10 h-10 rounded-lg bg-success-soft text-success flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{rowCount} rows</p>
                </div>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-sm font-medium text-accent-text hover:underline px-2"
                >
                    Replace
                </button>
                {onClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label="Remove file"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
        );
    }

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                    "w-full rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors group",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
                    dragging ? "border-accent bg-accent-soft" : "border-border hover:border-border-strong hover:bg-muted/50",
                    error && "border-danger/50"
                )}
            >
                <div className="mx-auto w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center group-hover:text-foreground transition-colors">
                    <Upload className="w-5 h-5" />
                </div>
                <p className="mt-4 font-medium text-foreground">{busy ? "Reading…" : "Drop a CSV file here"}</p>
                <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
                {hint && <div className="mt-3 text-xs text-muted-foreground">{hint}</div>}
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
    );
}
