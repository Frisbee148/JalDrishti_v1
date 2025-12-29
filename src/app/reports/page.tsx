"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, CheckCircle2, Loader2, FileImage } from "lucide-react";

export default function ReportsPage() {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [verified, setVerified] = useState(false);

    const handleSimulate = () => {
        setUploading(true);

        // Simulate Upload
        setTimeout(() => {
            setUploading(false);
            setAnalyzing(true);

            // Simulate AI Analysis
            setTimeout(() => {
                setAnalyzing(false);
                setVerified(true);

                // Redirect back to map after showing success
                setTimeout(() => {
                    router.push("/dashboard?report=success");
                }, 1500);
            }, 2000);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-background border-l border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

            <div className="max-w-xl w-full">
                <h1 className="text-3xl font-bold text-white mb-2">Report Incident</h1>
                <p className="text-slate-400 mb-8">Upload site imagery for AI Verification and 3D Water Depth Estimation.</p>

                <div className="bg-surface border-2 border-dashed border-white/10 rounded-2xl p-12 text-center transition-all hover:border-primary/50 group">

                    {!uploading && !analyzing && !verified && (
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-16 w-16 bg-background rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <UploadCloud className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-white">Drag & drop site image</h3>
                                <p className="text-slate-500 text-sm mt-1">or click to browse local files</p>
                            </div>
                            <Button onClick={handleSimulate} className="mt-4">
                                Simulate Upload
                            </Button>
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
                            <p className="text-slate-300">Running Computer Vision Model...</p>
                            <p className="text-xs text-slate-500">Estimating water depth based on reference objects</p>
                        </div>
                    )}

                    {verified && (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                            <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Verified: High Severity</h3>
                                <p className="text-emerald-400 mt-1">Estimated Depth: 1.2 ft</p>
                                <p className="text-slate-500 text-sm mt-4">Geo-tagging incident on Live Map...</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
