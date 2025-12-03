"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import Papa from "papaparse";
import { cn } from "@/lib/utils";

interface UploadStepProps {
    onDataParsed: (data: any[], headers: string[]) => void;
}

export function UploadStep({ onDataParsed }: UploadStepProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile && droppedFile.type === "text/csv") {
                handleFile(droppedFile);
            } else {
                setError("Please upload a valid CSV file.");
            }
        },
        []
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleFile = (file: File) => {
        setFile(file);
        setError(null);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setError("Error parsing CSV file.");
                    console.error(results.errors);
                } else {
                    onDataParsed(results.data, results.meta.fields || []);
                }
            },
            error: (err) => {
                setError("Error reading file: " + err.message);
            },
        });
    };

    const clearFile = () => {
        setFile(null);
        setError(null);
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <div
                className={cn(
                    "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
                    isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400",
                    error ? "border-red-500 bg-red-50" : ""
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {file ? (
                    <div className="flex items-center justify-center gap-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div className="text-left">
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFile();
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex justify-center">
                            <Upload className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium text-gray-700">
                            Drop your CSV file here
                        </p>
                        <p className="text-sm text-gray-500">or click to browse</p>
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
            )}
        </div>
    );
}
