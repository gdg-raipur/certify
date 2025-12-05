"use client";

import { useState } from "react";
import { UploadStep } from "@/components/UploadStep";
import { MappingStep } from "@/components/MappingStep";
import { DesignStep } from "@/components/DesignStep";
import { GenerateStep } from "@/components/GenerateStep";
import { CsvColumnMapping } from "@/types";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
    { id: "upload", title: "Upload CSV" },
    { id: "mapping", title: "Map Fields" },
    { id: "design", title: "Design Certificate" },
    { id: "generate", title: "Generate & Download" },
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
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                        Certify
                    </h1>
                    <p className="text-lg text-gray-600">
                        Bulk generate certificates with QR codes in seconds.
                    </p>
                </div>

                {/* Stepper */}
                <div className="mb-12">
                    <div className="flex items-center justify-center">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center relative">
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors duration-200 z-10",
                                            index < currentStep
                                                ? "bg-green-500 text-white"
                                                : index === currentStep
                                                    ? "bg-blue-600 text-white shadow-lg ring-4 ring-blue-100"
                                                    : "bg-gray-200 text-gray-500"
                                        )}
                                    >
                                        {index < currentStep ? (
                                            <Check className="w-6 h-6" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            "absolute top-12 text-xs font-medium whitespace-nowrap",
                                            index <= currentStep ? "text-gray-900" : "text-gray-400"
                                        )}
                                    >
                                        {step.title}
                                    </span>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={cn(
                                            "w-20 h-0.5 mx-2",
                                            index < currentStep ? "bg-green-500" : "bg-gray-200"
                                        )}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="transition-all duration-300 ease-in-out">
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
