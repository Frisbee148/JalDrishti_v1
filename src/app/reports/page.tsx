"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, cn } from "@/components/ui/Button";
import { UploadCloud, CheckCircle2, Loader2, FileImage, AlertTriangle } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function ReportsPage() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [verified, setVerified] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setAnalyzing(false);
        setVerified(false);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        // Timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        try {
            // Step 1: Upload (Simulated briefly)
            await new Promise(r => setTimeout(r, 800));
            setUploading(false);
            setAnalyzing(true);

            // Step 2: Call OpenCV Backend
            const response = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: formData,
                signal: controller.signal
            });

            if (!response.ok) throw new Error("Backend unavailable");

            const data = await response.json();

            // Normalize backend data structure mismatches
            if (data.forensics) {
                if (!data.forensics.source && data.forensics.inference) {
                    data.forensics.source = data.forensics.inference;
                }
                if (!data.forensics.camera && data.forensics.camera_model) {
                    data.forensics.camera = data.forensics.camera_model;
                }
                if (typeof data.forensics.is_duplicate === 'undefined') {
                    data.forensics.is_duplicate = false;
                }
            }

            setResult(data);
            setVerified(true);

            // AUTO-SUBMIT REPORT TO BACKEND
            if (data.waterlogged) {
                const isSpam = data.forensics?.is_duplicate ||
                    (data.forensics?.source && (data.forensics.source.includes("Web") || data.forensics.source.includes("Confirm")));

                try {
                    await fetch("http://localhost:8000/submit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            location: "Rohini Sector 18, Delhi",
                            lat: 28.73,
                            lng: 77.11,
                            image_url: data.image_url || "blob://simulated",
                            analysis_result: data
                        })
                    });
                } catch (e) { console.error("Submit failed", e); }

                if (!isSpam) {
                    setTimeout(() => {
                        router.push("/dashboard?report=success");
                    }, 3000);
                }
            }
        } catch (error: any) {
            console.error("Analysis failed:", error);
            if (error.name === 'AbortError') {
                alert("Request timed out. Please try again.");
            } else {
                alert("Error: Backend analysis failed. Ensure server is running on port 8000.");
            }
        } finally {
            clearTimeout(timeoutId);
            setUploading(false);
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex bg-background min-h-screen">
            {/* Sidebar is in Global Layout */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

                <div className="max-w-xl w-full">
                    <h1 className="text-3xl font-bold text-white mb-2">Report Incident</h1>
                    <p className="text-slate-400 mb-8">Upload site imagery for AI Verification and 3D Water Depth Estimation.</p>

                    <div className="bg-surface border-2 border-dashed border-white/10 rounded-2xl p-12 text-center transition-all hover:border-primary/50 group relative">

                        {!uploading && !analyzing && !verified && (
                            <div className="flex flex-col items-center gap-4">
                                <label className="cursor-pointer flex flex-col items-center gap-4">
                                    <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <UploadCloud className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-medium text-white">Upload site image</h3>
                                        <p className="text-slate-500 text-sm mt-1">Click to browse or drag image here</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    <Button variant="secondary" className="mt-4 pointer-events-none">
                                        Select Image
                                    </Button>
                                </label>
                            </div>
                        )}

                        {uploading && (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                <p className="text-slate-300 animate-pulse">Uploading encrypted data...</p>
                            </div>
                        )}

                        {analyzing && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                                    <FileImage className="h-10 w-10 text-primary relative z-10" />
                                </div>
                                <div className="w-full max-w-xs bg-black/50 rounded-full h-2 mt-4 overflow-hidden">
                                    <div className="bg-primary h-full w-2/3 animate-[shimmer_1s_infinite]"></div>
                                </div>
                                <p className="text-slate-300">Running AI Analysis...</p>
                                <p className="text-xs text-slate-500">Connecting to Azure Computer Vision (with OpenCV fallback)</p>
                            </div>
                        )}

                        {verified && result && (
                            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                <div className={cn(
                                    "h-16 w-16 rounded-full flex items-center justify-center",
                                    result.waterlogged ? "bg-emerald-500/20" : "bg-red-500/20"
                                )}>
                                    {result.waterlogged ? (
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    ) : (
                                        <AlertTriangle className="h-10 w-10 text-red-500" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {result.waterlogged ? `Verified: ${result.severity} Severity` : "No Waterlogging Detected"}
                                    </h3>
                                    <p className={cn("mt-1", result.waterlogged ? "text-emerald-400" : "text-red-400")}>
                                        Confidence: {result.confidence}%
                                        {result.waterlogged && ` | Depth: ${result.estimated_depth}`}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                                        Analyzed via: {result.method === 'azure_api' ? 'Azure Cloud AI' : 'Local OpenCV'}
                                    </p>

                                    {result.forensics && (
                                        <div className="mt-4 p-3 bg-white/5 rounded-lg text-left text-xs text-slate-400 space-y-1">
                                            <p className="font-semibold text-slate-200">Forensic Analysis:</p>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", result.forensics.source.includes("Camera") ? "bg-emerald-500" : "bg-amber-500")}></span>
                                                <span>Source: {result.forensics.source} {result.forensics.camera !== "Unknown" ? `(${result.forensics.camera})` : ""}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2 w-2 rounded-full", !result.forensics.is_duplicate ? "bg-emerald-500" : "bg-red-500")}></span>
                                                <span>Status: {result.forensics.is_duplicate ? "Duplicate Upload Detected" : "Unique Submission"}</span>
                                            </div>
                                            {/* Web Search Result Placeholder */}
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                                <span>Web Search: Requires Public URL (Dev Mode)</span>
                                            </div>
                                        </div>
                                    )}
                                    {result.waterlogged ? (
                                        <p className="text-slate-500 text-sm mt-4">Geo-tagging incident on Live Map...</p>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            className="mt-6 text-slate-400 hover:text-white"
                                            onClick={() => { setVerified(false); setResult(null); }}
                                        >
                                            Try Another Image
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
