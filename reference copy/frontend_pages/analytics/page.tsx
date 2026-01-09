"use client";

import { useState } from "react";
import { FactorMap } from "@/components/analytics/FactorMap";
import { BarChart3, Layers, Info } from "lucide-react";

const FREQUENCY_DATA = [
    { label: "1-2 times", value: 85, freq: "57.4%", color: "bg-blue-500" },
    { label: "3-4 times", value: 30, freq: "20.3%", color: "bg-blue-600" },
    { label: "5-7 times", value: 16, freq: "10.8%", color: "bg-blue-700" },
    { label: ">= 8 times", value: 17, freq: "11.5%", color: "bg-blue-800" },
];

const FACTORS = [
    { id: "ws-dens", label: "Waterlogging Spot Density", desc: "Density of reported waterlogging incidents." },
    { id: "pop-dens", label: "Population Density", desc: "Human population concentration per ward." },
    { id: "road-dens", label: "Road Density", desc: "Concentration of road networks." },
    { id: "dem", label: "Digital Elevation Model", desc: "Terrain height and slope analysis." },
    { id: "ndvi", label: "Vegetation Index (NDVI)", desc: "Normalized Difference Vegetation Index." },
    { id: "mndwi", label: "Water Index (MNDWI)", desc: "Modified Normalized Difference Water Index." },
    { id: "isp", label: "Impervious Surface %", desc: "Percentage of artificial surfaces." },
];

export default function AnalyticsPage() {
    const [activeFactor, setActiveFactor] = useState(FACTORS[0]);

    return (
        <div className="min-h-screen bg-background p-8 space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-foreground">Spatial Risk Analytics</h1>
                <p className="text-slate-400 mt-2">Analysis of explanatory variables correlated with waterlogging risk.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">

                {/* LEFT COLUMN: Data & Controls */}
                <div className="space-y-8 flex flex-col h-full overflow-y-auto pr-2">

                    {/* CHART SECTION (Figure 5) */}
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 shrink-0">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={20} className="text-primary" />
                            Occurrence Frequency (2012-2018)
                        </h3>
                        <div className="flex items-end justify-between h-64 gap-4 px-4 border-b border-white/5 pb-2">
                            {FREQUENCY_DATA.map((item) => (
                                <div key={item.label} className="flex flex-col items-center gap-2 flex-1 group h-full justify-end">
                                    <div className="relative w-full flex justify-center items-end flex-1">
                                        <div
                                            className={`w-full max-w-[40px] ${item.color} rounded-t-sm transition-all group-hover:opacity-80`}
                                            style={{ height: `${(item.value / 90) * 100}%` }}
                                        >
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                                        <p className="text-[10px] text-slate-500">{item.freq}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-4 italic">
                            Figure 5: Waterlogging occurrence frequencies caused by rainstorms.
                        </p>
                    </div>

                    {/* FACTOR SELECTION (Factors a-g) */}
                    <div className="bg-surface border border-white/10 rounded-2xl p-6 flex-1">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Layers size={20} className="text-primary" />
                            Parameter Layers
                        </h3>
                        <div className="space-y-2">
                            {FACTORS.map((factor) => (
                                <button
                                    key={factor.id}
                                    onClick={() => setActiveFactor(factor)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between group ${activeFactor.id === factor.id
                                        ? "bg-primary/20 border-primary/50 text-white"
                                        : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white"
                                        }`}
                                >
                                    <div>
                                        <span className="font-medium block">{factor.label}</span>
                                        <span className={`text-xs ${activeFactor.id === factor.id ? "text-primary-foreground/70" : "text-slate-500"}`}>
                                            {factor.desc}
                                        </span>
                                    </div>
                                    {activeFactor.id === factor.id && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Map Viewer */}
                <div className="h-full bg-black/20 rounded-2xl relative">
                    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-xl">
                        Viewing: {activeFactor.label}
                    </div>
                    <FactorMap activeFactor={activeFactor.id} />
                </div>

            </div>
        </div>
    );
}
