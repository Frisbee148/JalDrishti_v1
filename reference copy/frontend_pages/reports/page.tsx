"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, CheckCircle2, Loader2, MapPin, AlertTriangle, FileVideo, ShieldAlert } from "lucide-react";
import { useIncidents } from "@/context/IncidentContext";

// Delhi NCR Approximate Bounds
const DELHI_BOUNDS = {
    minLat: 28.40,
    maxLat: 28.90,
    minLon: 76.83,
    maxLon: 77.35
};

export default function ReportsPage() {
    const router = useRouter();
    const { addIncident } = useIncidents();

    const [step, setStep] = useState<"form" | "uploading" | "success">("form");

    // Location State
    const [locStatus, setLocStatus] = useState<"idle" | "fetching" | "success" | "error" | "out-of-bounds">("idle");
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [locationName, setLocationName] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        type: "Severe Waterlogging", // Default high priority
        description: "",
        videoFile: null as File | null
    });

    const detectLocation = () => {
        setLocStatus("fetching");
        if (!navigator.geolocation) {
            setLocStatus("error");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setCoords({ lat: latitude, lon: longitude });

                // Check Geofence
                const inDelhi =
                    latitude >= DELHI_BOUNDS.minLat && latitude <= DELHI_BOUNDS.maxLat &&
                    longitude >= DELHI_BOUNDS.minLon && longitude <= DELHI_BOUNDS.maxLon;

                if (inDelhi) {
                    setLocStatus("success");
                    // Reverse geocoding simulation (Mocking an API call)
                    setLocationName(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (Verified)`);
                } else {
                    setLocStatus("out-of-bounds");
                }
            },
            () => {
                setLocStatus("error");
            },
            { enableHighAccuracy: true }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, videoFile: e.target.files[0] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (locStatus !== "success") return;

        setStep("uploading");

        // Simulate network delay and AI processing of video
        setTimeout(() => {
            addIncident({
                loc: locationName || "Verified GPS Location",
                type: formData.type,
                severe: true, // Auto-flagged based on "video analysis"
                description: formData.description
            });
            setStep("success");

            // Redirect after success
            setTimeout(() => {
                router.push("/admin");
            }, 2000);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-background border-l border-white/5 p-8 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

            <div className="max-w-xl w-full">
                <h1 className="text-3xl font-bold text-white mb-2">Report Incident</h1>
                <p className="text-slate-400 mb-8">
                    Submit a verified report. Location detection and video evidence are mandatory.
                </p>

                <div className="bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {step === "form" && (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* 1. Mandatory Location Detection */}
                            <div className="bg-black/30 p-4 rounded-xl border border-white/10">
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    1. Location Verification (Mandatory)
                                </label>

                                {locStatus === "idle" && (
                                    <div className="text-center">
                                        <Button type="button" onClick={detectLocation} variant="outline" className="w-full border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-white">
                                            <MapPin className="mr-2 h-4 w-4" /> Detect My Location
                                        </Button>
                                        <p className="text-xs text-slate-500 mt-2"> GPS access required to verify you are in Delhi NCR.</p>
                                    </div>
                                )}

                                {locStatus === "fetching" && (
                                    <div className="flex items-center justify-center py-2 text-slate-400">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying coordinates...
                                    </div>
                                )}

                                {locStatus === "success" && (
                                    <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg flex items-center text-green-400">
                                        <CheckCircle2 className="mr-2 h-5 w-5" />
                                        <div>
                                            <div className="font-bold text-sm">Location Verified</div>
                                            <div className="text-xs opacity-80">{locationName}</div>
                                        </div>
                                    </div>
                                )}

                                {locStatus === "out-of-bounds" && (
                                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center text-red-400">
                                        <ShieldAlert className="mr-2 h-5 w-5" />
                                        <div>
                                            <div className="font-bold text-sm">Location Denied</div>
                                            <div className="text-xs opacity-80">You are outside the Delhi region. Report cannot be submitted.</div>
                                        </div>
                                    </div>
                                )}

                                {locStatus === "error" && (
                                    <div className="text-red-400 text-sm flex items-center">
                                        <AlertTriangle className="mr-2 h-4 w-4" /> Could not fetch GPS. Ensure permissions are allowed.
                                    </div>
                                )}
                            </div>

                            {/* 2. Form Fields (Disabled until location verified) */}
                            <div className={`space-y-6 transition-opacity duration-300 ${locStatus === 'success' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">2. Video Evidence (Mandatory)</label>
                                    <div className="relative">
                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-black/50 border-gray-600 hover:border-primary hover:bg-black/70">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <FileVideo className="w-8 h-8 mb-3 text-slate-400" />
                                                    <p className="text-sm text-slate-400">
                                                        {formData.videoFile ? (
                                                            <span className="text-primary font-bold">{formData.videoFile.name}</span>
                                                        ) : (
                                                            <span className="text-slate-400">Click to upload video of the area</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} required />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">3. Incident Type</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Severe Waterlogging">Severe Waterlogging</option>
                                        <option value="Blocked Drainage">Blocked Drainage</option>
                                        <option value="Road Submerged">Road Submerged</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">4. Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Additional details..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={locStatus !== "success" || !formData.videoFile}
                                >
                                    <UploadCloud className="mr-2 h-5 w-5" /> Submit Verified Report
                                </Button>
                            </div>

                        </form>
                    )}

                    {step === "uploading" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            <div className="text-center">
                                <h3 className="text-white font-medium text-lg">Uploading Proof</h3>
                                <p className="text-slate-400">Analyzing video & verifying location metadata...</p>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="flex flex-col items-center justify-center py-8 gap-4 animate-in zoom-in">
                            <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-white font-bold text-xl">Report Verified & Submitted</h3>
                                <p className="text-emerald-400 mt-1">Geotagged Video Received.</p>
                                <div className="mt-4 bg-white/5 p-3 rounded text-xs text-slate-400 font-mono">
                                    Coords: {coords?.lat.toFixed(4)}, {coords?.lon.toFixed(4)} <br />
                                    Region: Delhi NCR
                                </div>
                                <p className="text-slate-500 mt-4 text-sm">Redirecting...</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
