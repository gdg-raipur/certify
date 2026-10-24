import Papa from "papaparse";
import type { Row } from "./template";

export interface ParsedCsv {
    rows: Row[];
    headers: string[];
}

export function isCsvFile(file: File): boolean {
    // Windows often reports CSVs as application/vnd.ms-excel, so trust the extension.
    return /\.csv$/i.test(file.name) || file.type === "text/csv";
}

export function parseCsv(file: File): Promise<ParsedCsv> {
    return new Promise((resolve, reject) => {
        Papa.parse<Row>(file, {
            header: true,
            skipEmptyLines: "greedy",
            transformHeader: (h) => h.trim(),
            complete: (results) => {
                const headers = (results.meta.fields || []).filter(Boolean);
                if (headers.length === 0) {
                    reject(new Error("The CSV has no header row."));
                    return;
                }
                const fatal = results.errors.find((e) => e.type === "Delimiter" || e.code === "UndetectableDelimiter");
                if (fatal && results.data.length === 0) {
                    reject(new Error(fatal.message));
                    return;
                }
                const rows = results.data.map((row) => {
                    const clean: Row = {};
                    for (const h of headers) clean[h] = (row[h] ?? "").toString().trim();
                    return clean;
                });
                resolve({ rows, headers });
            },
            error: (err) => reject(err),
        });
    });
}

/** First header whose lowercase name matches one of the candidates (exact first, then substring). */
export function guessColumn(headers: string[], candidates: string[]): string {
    const lower = headers.map((h) => h.toLowerCase());
    for (const c of candidates) {
        const i = lower.indexOf(c);
        if (i !== -1) return headers[i];
    }
    for (const c of candidates) {
        const i = lower.findIndex((h) => h.includes(c));
        if (i !== -1) return headers[i];
    }
    return "";
}

export const guessNameColumn = (headers: string[]) =>
    guessColumn(headers, ["name", "full name", "fullname", "participant", "attendee"]);

export const guessEmailColumn = (headers: string[]) => guessColumn(headers, ["email", "e-mail", "mail"]);

export function toCsv(rows: Record<string, string | number | undefined>[], headers?: string[]): string {
    return Papa.unparse({ fields: headers ?? Object.keys(rows[0] ?? {}), data: rows.map((r) => (headers ?? Object.keys(r)).map((h) => r[h] ?? "")) });
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SAMPLE_CSV = `name,email,role
Ada Lovelace,ada@example.com,Speaker
Alan Turing,alan@example.com,Attendee
Grace Hopper,grace@example.com,Volunteer
`;

export function downloadSampleCsv() {
    downloadBlob(new Blob([SAMPLE_CSV], { type: "text/csv" }), "certify-sample.csv");
}
