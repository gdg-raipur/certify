"use client";

import { useCallback, useRef, useState } from "react";
import { sendEmails } from "@/actions/email";
import type { OutgoingEmail, SMTPConfig } from "@/lib/smtp";

export type DeliveryState = "queued" | "sending" | "sent" | "failed" | "unknown";

export interface Delivery {
    state: DeliveryState;
    error?: string;
}

export interface QueueOptions {
    /** Messages per server call (max 10). Keep small for attachments. */
    batchSize: number;
    /** Pause between server calls, to stay under provider rate limits. */
    delayMs: number;
}

/** Builds the message for an item, or returns an error string to mark it failed without sending. */
export type BuildMessage = (index: number) => Promise<OutgoingEmail | string> | OutgoingEmail | string;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Client-side send loop: chunks items into small server calls, tracks per-item delivery,
 * and supports pause / resume / stop. A chunk whose call never returns (timeout, network)
 * is marked "unknown" rather than "failed", since some of it may have been delivered.
 */
export function useSendQueue() {
    const [deliveries, setDeliveries] = useState<Record<number, Delivery>>({});
    const [running, setRunning] = useState(false);
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    const stopRef = useRef(false);

    const patch = useCallback((updates: Record<number, Delivery | undefined>) => {
        setDeliveries((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(updates)) {
                if (v) next[Number(k)] = v;
                else delete next[Number(k)];
            }
            return next;
        });
    }, []);

    const run = useCallback(
        async (indices: number[], build: BuildMessage, config: SMTPConfig, { batchSize, delayMs }: QueueOptions) => {
            if (indices.length === 0) return;
            stopRef.current = false;
            pausedRef.current = false;
            setPaused(false);
            setRunning(true);
            patch(Object.fromEntries(indices.map((i) => [i, { state: "queued" } as Delivery])));

            const size = Math.max(1, Math.min(10, batchSize));
            let cursor = 0;
            try {
                while (cursor < indices.length && !stopRef.current) {
                    while (pausedRef.current && !stopRef.current) await sleep(200);
                    if (stopRef.current) break;

                    const chunk = indices.slice(cursor, cursor + size);
                    cursor += chunk.length;

                    const toSend: { index: number; message: OutgoingEmail }[] = [];
                    const updates: Record<number, Delivery> = {};
                    for (const index of chunk) {
                        try {
                            const built = await build(index);
                            if (typeof built === "string") updates[index] = { state: "failed", error: built };
                            else {
                                toSend.push({ index, message: built });
                                updates[index] = { state: "sending" };
                            }
                        } catch (e) {
                            updates[index] = { state: "failed", error: (e as Error).message || "Couldn't prepare this email" };
                        }
                    }
                    patch(updates);
                    if (toSend.length === 0) continue;

                    try {
                        const results = await sendEmails(config, toSend.map((t) => t.message));
                        patch(
                            Object.fromEntries(
                                toSend.map((t, j) => {
                                    const r = results[j];
                                    return [t.index, r?.ok ? { state: "sent" } : { state: "failed", error: r?.error || "Unknown error" }];
                                })
                            )
                        );
                    } catch {
                        patch(
                            Object.fromEntries(
                                toSend.map((t) => [
                                    t.index,
                                    { state: "unknown", error: "No response from the server. This email may or may not have been sent." },
                                ])
                            )
                        );
                    }

                    if (cursor < indices.length && delayMs > 0) {
                        const until = Date.now() + delayMs;
                        while (Date.now() < until && !stopRef.current) await sleep(Math.min(200, until - Date.now()));
                    }
                }
            } finally {
                // Anything still queued was never attempted; clear it so it reads as "not sent".
                setDeliveries((prev) => {
                    const next = { ...prev };
                    for (const i of indices) if (next[i]?.state === "queued") delete next[i];
                    return next;
                });
                setRunning(false);
                setPaused(false);
                pausedRef.current = false;
            }
        },
        [patch]
    );

    const pause = useCallback(() => {
        pausedRef.current = true;
        setPaused(true);
    }, []);

    const resume = useCallback(() => {
        pausedRef.current = false;
        setPaused(false);
    }, []);

    const stop = useCallback(() => {
        stopRef.current = true;
    }, []);

    const reset = useCallback(() => setDeliveries({}), []);

    return { deliveries, running, paused, run, pause, resume, stop, reset };
}

export function countDeliveries(deliveries: Record<number, Delivery>) {
    const counts = { queued: 0, sending: 0, sent: 0, failed: 0, unknown: 0 };
    for (const d of Object.values(deliveries)) counts[d.state]++;
    return counts;
}
