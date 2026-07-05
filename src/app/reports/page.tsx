"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { UploadCloud, CheckCircle2, Loader2, MapPin, AlertTriangle, ImagePlus, ShieldAlert } from "lucide-react";

// Delhi NCR Approximate Bounds
const DELHI_BOUNDS = {
    minLat: 28.40,
    maxLat: 28.90,
    minLon: 76.83,
    maxLon: 77.35
};

export default function ReportsPage() {
    const router = useRouter();

    const [step, setStep] = useState<"form" | "uploading" | "success">("form");

    // Location State
    const [locStatus, setLocStatus] = useState<"idle" | "fetching" | "success" | "error" | "out-of-bounds">("idle");
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [locationName, setLocationName] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        type: "Severe Waterlogging", // Default high priority
        description: "",
        imageFile: null as File | null,
        imagePreview: "" as string
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
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            setFormData({ ...formData, imageFile: file, imagePreview: previewUrl });
        }
    };

    const [submitError, setSubmitError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (locStatus !== "success" || !formData.imageFile || !coords) return;

        setStep("uploading");
        setSubmitError("");

        try {
            // Step 1: Upload image to /analyze for AI processing
            const analyzeForm = new FormData();
            analyzeForm.append("file", formData.imageFile);

            const analyzeRes = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                body: analyzeForm,
            });

            if (!analyzeRes.ok) throw new Error("Image analysis failed");
            const analysisResult = await analyzeRes.json();

            // Step 2: Submit the report with analysis result to /submit
            const submitRes = await fetch("http://localhost:8000/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    location: locationName || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`,
                    lat: coords.lat,
                    lng: coords.lon,
                    image_url: analysisResult.image_url || "",
                    analysis_result: analysisResult,
                    user_id: "citizen_report",
                }),
            });

            if (!submitRes.ok) throw new Error("Report submission failed");

            setStep("success");

            // Redirect to admin after success
            setTimeout(() => {
                router.push("/admin");
            }, 2000);
        } catch (err: any) {
            console.error("Submit error:", err);
            setSubmitError(err.message || "Something went wrong. Is the backend running?");
            setStep("form");
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
                <p className="text-text-muted mb-8">
                    Submit a verified report. Location detection and image evidence are mandatory.
                </p>

                <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">

                    {step === "form" && (
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {submitError && (
                                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    {submitError}
                                </div>
                            )}
                            {/* 1. Mandatory Location Detection */}
                            <div className="bg-black/30 p-4 rounded-xl border border-border">
                                <label className="block text-sm font-medium text-text-soft mb-3">
                                    1. Location Verification (Mandatory)
                                </label>

                                {locStatus === "idle" && (
                                    <div className="text-center">
                                        <Button type="button" onClick={detectLocation} variant="outline" className="w-full border-dashed border-slate-600 text-text-muted hover:text-white hover:border-white">
                                            <MapPin className="mr-2 h-4 w-4" /> Detect My Location
                                        </Button>
                                        <p className="text-xs text-text-muted mt-2"> GPS access required to verify you are in Delhi NCR.</p>
                                    </div>
                                )}

                                {locStatus === "fetching" && (
                                    <div className="flex items-center justify-center py-2 text-text-muted">
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
                                    <div className="bg-red-500/10 border-2 border-red-500/40 p-5 rounded-xl text-red-400">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-red-500/20 p-2 rounded-lg shrink-0">
                                                <ShieldAlert className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-base text-red-300">⚠ You are outside Delhi NCR</div>
                                                <div className="text-sm opacity-90 mt-1">JalDrishti only accepts reports from within the Delhi NCR region. Your GPS coordinates indicate you are outside the service area.</div>
                                                <div className="text-xs opacity-70 mt-2 font-mono">
                                                    Your location: {coords?.lat.toFixed(4)}, {coords?.lon.toFixed(4)}
                                                </div>
                                                <div className="text-xs opacity-70 mt-1">
                                                    Required: Lat {DELHI_BOUNDS.minLat}–{DELHI_BOUNDS.maxLat}, Lon {DELHI_BOUNDS.minLon}–{DELHI_BOUNDS.maxLon}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setLocStatus("idle"); setCoords(null); }}
                                                    className="mt-3 text-xs text-red-300 underline hover:text-white"
                                                >
                                                    Retry Location Detection
                                                </button>
                                            </div>
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
                                    <label className="block text-sm font-medium text-text-soft mb-2">2. Image Evidence (Mandatory)</label>
                                    <div className="relative">
                                        <div className="flex items-center justify-center w-full">
                                            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-black/50 border-gray-600 hover:border-primary hover:bg-black/70 overflow-hidden">
                                                {formData.imagePreview ? (
                                                    <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <ImagePlus className="w-8 h-8 mb-3 text-text-muted" />
                                                        <p className="text-sm text-text-muted">Click to upload an image of the waterlogged area</p>
                                                        <p className="text-xs text-text-muted mt-1">JPG, PNG supported</p>
                                                    </div>
                                                )}
                                                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} required />
                                            </label>
                                        </div>
                                        {formData.imageFile && (
                                            <p className="text-xs text-primary mt-2 font-medium">{formData.imageFile.name}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-soft mb-2">3. Incident Type</label>
                                    <select
                                        className="w-full bg-black/50 border border-border rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Severe Waterlogging">Severe Waterlogging</option>
                                        <option value="Blocked Drainage">Blocked Drainage</option>
                                        <option value="Road Submerged">Road Submerged</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-soft mb-2">4. Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Additional details..."
                                        className="w-full bg-black/50 border border-border rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={locStatus !== "success" || !formData.imageFile}
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
                                <p className="text-text-muted">Analyzing image & verifying location metadata...</p>
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
                                <p className="text-emerald-400 mt-1">Geotagged Image Received.</p>
                                <div className="mt-4 bg-white/5 p-3 rounded text-xs text-text-muted font-mono">
                                    Coords: {coords?.lat.toFixed(4)}, {coords?.lon.toFixed(4)} <br />
                                    Region: Delhi NCR
                                </div>
                                <p className="text-text-muted mt-4 text-sm">Redirecting...</p>
                            </div>
                        </div>
                    )}

                    </div>
                </div>
            </div>
        </div>
    );
}
