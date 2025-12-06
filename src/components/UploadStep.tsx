"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X, FolderOpen } from "lucide-react";
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
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Info Box */}
            <div className="bg-sky-100 rounded-3xl p-8 flex flex-col justify-between shadow-sm md:col-span-1">
                <div>
                    <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center mb-4">
                        <FolderOpen className="w-6 h-6 text-sky-700" />
                    </div>
                    <h2 className="text-2xl font-bold text-sky-900 mb-2">Upload Data</h2>
                    <p className="text-sky-800/80">
                        Upload a CSV file containing your certificate recipients.
                    </p>
                </div>
                <div className="mt-8 p-4 bg-white/40 rounded-xl">
                    <h3 className="text-sm font-bold text-sky-900 uppercase mb-2 opacity-75">Required Columns</h3>
                    <ul className="text-sm text-sky-900/80 space-y-1 list-disc list-inside">
                        <li>Name</li>
                        <li>(Optional) Email</li>
                        <li>(Optional) Date</li>
                    </ul>
                </div>
            </div>

            {/* Dropzone */}
            <div className="md:col-span-2">
                <div
                    className={cn(
                        "h-full min-h-[300px] border-4 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative overflow-hidden bg-white shadow-sm",
                        isDragging
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50",
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
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 z-10">
                            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-10 h-10 text-indigo-600" />
                            </div>
                            <p className="text-xl font-bold text-slate-800 mb-1">{file.name}</p>
                            <p className="text-slate-500 mb-6">{(file.size / 1024).toFixed(1)} KB</p>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearFile();
                                }}
                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors font-medium flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Remove File
                            </button>
                        </div>
                    ) : (
                        <div className="z-10 flex flex-col items-center">
                            <div className="w-20 h-20 bg-indigo-100 group-hover:bg-indigo-200 group-hover:scale-110 transition-all rounded-full flex items-center justify-center mb-6">
                                <Upload className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">
                                Drop your CSV here
                            </h3>
                            <p className="text-slate-500 text-lg">
                                or click to browse files
                            </p>
                        </div>
                    )}
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center font-medium animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
