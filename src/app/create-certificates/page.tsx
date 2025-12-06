"use client";

import { useState } from "react";
import { UploadStep } from "@/components/UploadStep";
import { MappingStep } from "@/components/MappingStep";
import { DesignStep } from "@/components/DesignStep";
import { GenerateStep } from "@/components/GenerateStep";
import { CsvColumnMapping } from "@/types";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { id: "upload", title: "Upload CSV" },
    { id: "mapping", title: "Map Fields" },
    { id: "design", title: "Design" },
    { id: "generate", title: "Generate" },
];

export default function CreateCertificates() {
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<CsvColumnMapping | null>(null);
    const [designConfig, setDesignConfig] = useState<any>(null);

    const handleDataParsed = (parsedData: any[], parsedHeaders: string[]) => {
        setData(parsedData);
        setHeaders(parsedHeaders);
        setCurrentStep(1);
    };

    const handleMappingComplete = (map: CsvColumnMapping) => {
        setMapping(map);
        setCurrentStep(2);
    };

    const handleDesignComplete = (config: any) => {
        setDesignConfig(config);
        setCurrentStep(3);
    };

    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-4 text-indigo-600">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                        Create Certificates
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Follow the steps below to bulk generate certificates with unique verification codes.
                    </p>
                </div>

                {/* Stepper */}
                <div className="mb-12 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between relative">
                        {/* Connecting Line */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-500 -z-10 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                        ></div>

                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex flex-col items-center bg-slate-50 px-2">
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10 border-4",
                                        index < currentStep
                                            ? "bg-indigo-500 border-indigo-500 text-white scale-110"
                                            : index === currentStep
                                                ? "bg-white border-indigo-500 text-indigo-600 shadow-lg scale-125"
                                                : "bg-white border-slate-200 text-slate-400"
                                    )}
                                >
                                    {index < currentStep ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        "mt-3 text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                                        index <= currentStep ? "text-indigo-900" : "text-slate-400"
                                    )}
                                >
                                    {step.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="transition-all duration-500 ease-in-out">
                    {currentStep === 0 && <UploadStep onDataParsed={handleDataParsed} />}
                    {currentStep === 1 && (
                        <MappingStep headers={headers} onMappingComplete={handleMappingComplete} />
                    )}
                    {currentStep === 2 && (
                        <DesignStep onDesignComplete={handleDesignComplete} />
                    )}
                    {currentStep === 3 && (
                        <GenerateStep
                            data={data}
                            mapping={mapping}
                            designConfig={designConfig}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
