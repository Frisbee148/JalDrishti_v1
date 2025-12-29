"use client";

import { useState, Suspense } from "react";
import { MapboxView } from "@/components/map/MapboxView";
import { RainfallSlider } from "@/components/dashboard/RainfallSlider";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
    const [rainfall, setRainfall] = useState(0);
    const searchParams = useSearchParams();
    const hasNewReport = searchParams.get("report") === "success";

    return (
        <div className="relative w-full h-[calc(100vh)] bg-background overflow-hidden">
            <MapboxView rainfallIntensity={rainfall} />

            {/* Overlay controls */}
            <RainfallSlider intensity={rainfall} onIntensityChange={setRainfall} />

            {/* Verification Badge Notification */}
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
