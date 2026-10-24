"use client";

import { ArrowRight, CalendarDays, FileSpreadsheet } from "lucide-react";
import { CsvDropzone } from "@/components/CsvDropzone";
import { Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui";
import { downloadSampleCsv, guessEmailColumn, guessNameColumn } from "@/lib/csv";
import type { CertificateDetails } from "@/lib/certificate/types";
import type { CsvState } from "./CertificateWizard";

interface DataStepProps {
    csv: CsvState;
    setCsv: (csv: CsvState) => void;
    nameCol: string;
    setNameCol: (c: string) => void;
    emailCol: string;
    setEmailCol: (c: string) => void;
    details: CertificateDetails;
    setDetails: (d: CertificateDetails) => void;
    onNext: () => void;
}

export function DataStep({ csv, setCsv, nameCol, setNameCol, emailCol, setEmailCol, details, setDetails, onNext }: DataStepProps) {
    const headers = csv?.headers ?? [];
    const canContinue = Boolean(csv && nameCol);

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
            <Card>
                <CardHeader
                    icon={<FileSpreadsheet />}
                    title="Recipients"
                    description="One row per certificate. Any column can be printed on the certificate or used in the email."
                    action={
                        <button type="button" onClick={downloadSampleCsv} className="text-sm font-medium text-accent-text hover:underline">
                            Sample CSV
                        </button>
                    }
                />
                <CardBody className="space-y-5">
                    <CsvDropzone
                        fileName={csv?.fileName}
                        rowCount={csv?.rows.length}
                        onLoaded={(parsed, fileName) => {
                            setCsv({ ...parsed, fileName });
                            setNameCol(guessNameColumn(parsed.headers));
                            setEmailCol(guessEmailColumn(parsed.headers));
                        }}
                        onClear={() => setCsv(null)}
                        hint={
                            <>
                                At minimum a <span className="font-mono">name</span> column. Add <span className="font-mono">email</span> to send certificates.
                            </>
                        }
                    />

                    {csv && (
                        <>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Recipient name column" hint="Printed on the certificate and shown when it's verified.">
                                    {(id) => (
                                        <Select id={id} value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                                            <option value="">Select a column…</option>
                                            {headers.map((h) => (
                                                <option key={h} value={h}>
                                                    {h}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                                <Field label="Email column (optional)" hint="Needed only if you want to email certificates.">
                                    {(id) => (
                                        <Select id={id} value={emailCol} onChange={(e) => setEmailCol(e.target.value)}>
                                            <option value="">None</option>
                                            {headers.map((h) => (
                                                <option key={h} value={h}>
                                                    {h}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                            </div>

                            <div className="rounded-xl border border-border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/60 text-left">
                                            <tr>
                                                {headers.map((h) => (
                                                    <th key={h} className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                                                        {h}
                                                        {h === nameCol && <span className="ml-1.5 text-accent-text text-xs">name</span>}
                                                        {h === emailCol && <span className="ml-1.5 text-accent-text text-xs">email</span>}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {csv.rows.slice(0, 5).map((row, i) => (
                                                <tr key={i}>
                                                    {headers.map((h) => (
                                                        <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[220px] truncate">
                                                            {row[h]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {csv.rows.length > 5 && (
                                    <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-muted/30">
                                        and {csv.rows.length - 5} more rows
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader
                        icon={<CalendarDays />}
                        title="Certificate details"
                        description="Shown on the verification page. Use them on the design as {{event}}, {{issuer}} and {{issue_date}}."
                    />
                    <CardBody className="space-y-4">
                        <Field label="Event or certificate title">
                            {(id) => (
                                <Input id={id} value={details.event} placeholder="DevFest Raipur 2026" onChange={(e) => setDetails({ ...details, event: e.target.value })} />
                            )}
                        </Field>
                        <Field label="Issued by">
                            {(id) => <Input id={id} value={details.issuer} placeholder="GDG Raipur" onChange={(e) => setDetails({ ...details, issuer: e.target.value })} />}
                        </Field>
                        <Field label="Issue date">
                            {(id) => <Input id={id} type="date" value={details.issuedOn} onChange={(e) => setDetails({ ...details, issuedOn: e.target.value })} />}
                        </Field>
                    </CardBody>
                </Card>

                <Button size="lg" className="w-full" disabled={!canContinue} onClick={onNext}>
                    Continue to design
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
