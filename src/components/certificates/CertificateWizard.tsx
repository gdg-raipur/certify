"use client";

import { useState } from "react";
import { Award, Check } from "lucide-react";
import { PageHeader } from "@/components/ui";
import type { ParsedCsv } from "@/lib/csv";
import { todayIso } from "@/lib/certificate/helpers";
import type { CertificateDetails, Design } from "@/lib/certificate/types";
import { cn } from "@/lib/utils";
import { DataStep } from "./DataStep";
import { DesignStep } from "./DesignStep";
import { GenerateStep } from "./GenerateStep";

const STEPS = ["Details & data", "Design", "Generate & send"];

export type CsvState = (ParsedCsv & { fileName: string }) | null;

export function CertificateWizard() {
    const [step, setStep] = useState(0);
    const [csv, setCsv] = useState<CsvState>(null);
    const [nameCol, setNameCol] = useState("");
    const [emailCol, setEmailCol] = useState("");
    const [details, setDetails] = useState<CertificateDetails>({ event: "", issuer: "", issuedOn: todayIso() });
    const [design, setDesign] = useState<Design>({ template: null, layers: [], customFont: null });

    const go = (n: number) => {
        setStep(n);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
            <PageHeader
                icon={<Award />}
                title="Certificates"
                description="Upload your attendee list and a certificate design, then generate verifiable PDFs for everyone in one go."
            />

            <ol className="mb-8 grid grid-cols-3 gap-2">
                {STEPS.map((label, i) => {
                    const done = i < step;
                    const current = i === step;
                    const reachable = i < step;
                    return (
                        <li key={label}>
                            <button
                                type="button"
                                disabled={!reachable}
                                onClick={() => go(i)}
                                className={cn(
                                    "w-full text-left border-t-2 pt-3 transition-colors",
                                    current ? "border-accent" : done ? "border-accent/50 hover:border-accent" : "border-border",
                                    !reachable && "cursor-default"
                                )}
                            >
                                <span className={cn("flex items-center gap-1.5 text-xs font-medium", current || done ? "text-accent-text" : "text-muted-foreground")}>
                                    {done ? <Check className="w-3.5 h-3.5" /> : `Step ${i + 1}`}
                                </span>
                                <span className={cn("block text-sm font-medium mt-0.5", current ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div key={step} className="animate-fade-up">
                {step === 0 && (
                    <DataStep
                        csv={csv}
                        setCsv={setCsv}
                        nameCol={nameCol}
                        setNameCol={setNameCol}
                        emailCol={emailCol}
                        setEmailCol={setEmailCol}
                        details={details}
                        setDetails={setDetails}
                        onNext={() => go(1)}
                    />
                )}
                {step === 1 && csv && (
                    <DesignStep csv={csv} nameCol={nameCol} details={details} design={design} setDesign={setDesign} onBack={() => go(0)} onNext={() => go(2)} />
                )}
                {step === 2 && csv && (
                    <GenerateStep csv={csv} nameCol={nameCol} emailCol={emailCol} setEmailCol={setEmailCol} details={details} design={design} onBack={() => go(1)} />
                )}
            </div>
        </main>
    );
}
