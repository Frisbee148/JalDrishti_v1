"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { MapboxView } from "@/components/map/MapboxView";
import { RainfallSlider } from "@/components/dashboard/RainfallSlider";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
    const [rainfall, setRainfall] = useState(0);
    const [reports, setReports] = useState<any[]>([]);
    const [wardScores, setWardScores] = useState<Record<string, number>>({});
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

    // Call RF /predict whenever slider changes (debounced 500ms)
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
        }, 500);
        return () => { if (predictTimer.current) clearTimeout(predictTimer.current); };
    }, [rainfall]);

    return (
        <div className="relative w-full h-[calc(100vh)] bg-background overflow-hidden">
            <MapboxView rainfallIntensity={rainfall} liveReports={reports} wardScores={wardScores} />

            <RainfallSlider intensity={rainfall} onIntensityChange={setRainfall} />

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
