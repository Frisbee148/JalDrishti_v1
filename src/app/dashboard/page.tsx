"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { MapboxView } from "@/components/map/MapboxView";
import { RainfallSlider } from "@/components/dashboard/RainfallSlider";
import { useSearchParams } from "next/navigation";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

function DashboardContent() {
    const [rainfall, setRainfall] = useState(0);
    const [reports, setReports] = useState<any[]>([]);
    const [wardScores, setWardScores] = useState<Record<string, number>>({});
    const [hotspots, setHotspots] = useState<any[]>([]);
    const [selectedHotspot, setSelectedHotspot] = useState<[number, number] | null>(null);
    const [isHotspotsOpen, setIsHotspotsOpen] = useState(false);
    const predictTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchParams = useSearchParams();
    const hasNewReport = searchParams.get("report") === "success";

    // Fetch live reports once on mount
    useEffect(() => {
        fetch("http://localhost:8000/reports")
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                setReports(data.filter((r: any) =>
                    r.admin_status !== "rejected" && (!r.is_spam || r.admin_status === "approved")
                ));
            })
            .catch(err => console.error(err));
    }, []);

    // Fetch hotspots for the dropdown
    useEffect(() => {
        fetch("/data/hotspots.json")
            .then(res => res.json())
            .then(data => {
                if (data && data.features) {
                    setHotspots(data.features.filter((f: any) => f.properties.type === "chronic"));
                }
            })
            .catch(err => console.error("Failed to load hotspots sidebar data", err));
    }, []);

    // Call RF /predict whenever slider changes (debounced 150ms)
    useEffect(() => {
        if (predictTimer.current) clearTimeout(predictTimer.current);
        predictTimer.current = setTimeout(async () => {
            try {
                const res = await fetch("http://localhost:8000/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ rainfall_mm: rainfall }),
                });
                if (!res.ok) return;
                const data = await res.json();
                if (data.ward_scores) setWardScores(data.ward_scores);
            } catch {
                // backend offline — map falls back to uniform height
            }
        }, 150);
        return () => { if (predictTimer.current) clearTimeout(predictTimer.current); };
    }, [rainfall]);

    return (
        <div className="relative w-full h-[calc(100vh)] bg-background overflow-hidden">
            
            {/* Map Area */}
            <MapboxView 
                rainfallIntensity={rainfall} 
                liveReports={reports} 
                wardScores={wardScores} 
                selectedHotspot={selectedHotspot}
            />

            <RainfallSlider intensity={rainfall} onIntensityChange={setRainfall} />

            {/* Collapsible Chronic Hotspots Dropdown (Right side) */}
            <div className="absolute top-6 right-6 z-30 w-80 shadow-2xl">
                <div 
                    onClick={() => setIsHotspotsOpen(!isHotspotsOpen)}
                    className="bg-surface/95 backdrop-blur-md border border-white/10 rounded-t-xl cursor-pointer p-4 flex items-center justify-between"
                    style={{ borderBottomLeftRadius: isHotspotsOpen ? '0' : '0.75rem', borderBottomRightRadius: isHotspotsOpen ? '0' : '0.75rem' }}
                >
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin className="text-red-500 w-5 h-5" />
                        Chronic Hotspots
                    </h2>
                    {isHotspotsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>

                {isHotspotsOpen && (
                    <div className="bg-surface/95 backdrop-blur-md border-x border-b border-white/10 rounded-b-xl max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col p-2 space-y-2">
                        {hotspots.map((h, i) => {
                            const isSelected = selectedHotspot && selectedHotspot[0] === h.geometry.coordinates[0] && selectedHotspot[1] === h.geometry.coordinates[1];
                            return (
                                <div 
                                    key={i} 
                                    onClick={() => {
                                        setSelectedHotspot(h.geometry.coordinates as [number, number]);
                                        setIsHotspotsOpen(false); // Close dropdown after selection
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-red-500/10 border-red-500/50' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                                >
                                    <h3 className="font-semibold text-white text-sm">{h.properties.name}</h3>
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{h.properties.description}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {hasNewReport && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="bg-surface/90 backdrop-blur-md border border-emerald-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                        <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-white font-medium">New Verified Incident Added to Map</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Loading Dashboard...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
