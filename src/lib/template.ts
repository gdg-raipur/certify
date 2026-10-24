// {{placeholder}} templating shared by the mass emailer and certificate generator.
// Keys match CSV headers case-insensitively, ignoring surrounding whitespace.

export type Row = Record<string, string | undefined>;

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

const normalize = (key: string) => key.trim().toLowerCase();

function lookup(row: Row, key: string): string | undefined {
    const target = normalize(key);
    for (const k of Object.keys(row)) {
        if (normalize(k) === target) return row[k];
    }
    return undefined;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Replaces {{key}} with values from row. Unknown keys are left untouched so they're easy to spot. */
export function renderTemplate(template: string, row: Row, opts: { escape?: boolean } = {}): string {
    return template.replace(PLACEHOLDER, (match, key: string) => {
        const value = lookup(row, key);
        if (value === undefined) return match;
        return opts.escape ? escapeHtml(value) : value;
    });
}

/** Unique placeholder keys used in the given templates, in order of appearance. */
export function findPlaceholders(...templates: string[]): string[] {
    const seen = new Map<string, string>();
    for (const t of templates) {
        for (const m of t.matchAll(PLACEHOLDER)) {
            const key = m[1];
            if (!seen.has(normalize(key))) seen.set(normalize(key), key);
        }
    }
    return [...seen.values()];
}

/** Placeholders that don't correspond to any available key. */
export function findUnknownPlaceholders(keys: string[], ...templates: string[]): string[] {
    const known = new Set(keys.map(normalize));
    return findPlaceholders(...templates).filter((p) => !known.has(normalize(p)));
}

/** Placeholders whose value is empty for this particular row. */
export function findEmptyPlaceholders(row: Row, ...templates: string[]): string[] {
    return findPlaceholders(...templates).filter((p) => {
        const v = lookup(row, p);
        return v !== undefined && v.trim() === "";
    });
}

export function htmlToText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
