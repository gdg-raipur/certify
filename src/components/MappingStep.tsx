"use client";

import { useState, useEffect } from "react";
import { CsvColumnMapping } from "@/types";
import { ArrowRight } from "lucide-react";

interface MappingStepProps {
    headers: string[];
    onMappingComplete: (mapping: CsvColumnMapping) => void;
}

export function MappingStep({ headers, onMappingComplete }: MappingStepProps) {
    const [mapping, setMapping] = useState<CsvColumnMapping>({
        name: "",
        verifyLink: "",
        design: "",
    });

    // Auto-map if headers match exactly or closely
    useEffect(() => {
        const newMapping = { ...mapping };
        headers.forEach((header) => {
            const lower = header.toLowerCase();
            if (lower.includes("name") && !newMapping.name) newMapping.name = header;
            if ((lower.includes("link") || lower.includes("url") || lower.includes("verify")) && !newMapping.verifyLink)
                newMapping.verifyLink = header;
            if ((lower.includes("design") || lower.includes("template")) && !newMapping.design)
                newMapping.design = header;
        });
        setMapping(newMapping);
    }, [headers]);

    const handleNext = () => {
        if (mapping.name) {
            onMappingComplete(mapping);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Map CSV Columns</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recipient Name (Required)
                        </label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={mapping.name}
                            onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                        >
                            <option value="">Select column...</option>
                            {headers.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unique ID or Link (Optional)
                        </label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={mapping.verifyLink}
                            onChange={(e) =>
                                setMapping({ ...mapping, verifyLink: e.target.value })
                            }
                        >
                            <option value="">Select column (or skip)...</option>
                            {headers.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Design/Template ID (Optional)
                        </label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={mapping.design}
                            onChange={(e) =>
                                setMapping({ ...mapping, design: e.target.value })
                            }
                        >
                            <option value="">Select column (or skip)...</option>
                            {headers.map((h) => (
                                <option key={h} value={h}>
                                    {h}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            If not mapped, you can select a global template in the next step.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleNext}
                    disabled={!mapping.name}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
