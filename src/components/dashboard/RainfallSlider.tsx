"use client";

import { useState, useEffect } from "react";
import { CloudRain } from "lucide-react";

interface RainfallSliderProps {
    intensity: number;
    onIntensityChange: (value: number) => void;
}

export function RainfallSlider({ intensity, onIntensityChange }: RainfallSliderProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-6">
            <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-water/10 rounded-lg text-water">
                            <CloudRain className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Rainfall Simulation</h3>
                            <p className="text-xs text-slate-400">Adjust intensity to predict logging</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-water">{intensity}</span>
                        <span className="text-xs text-slate-400 ml-1">mm/hr</span>
                    </div>
                </div>

                <input
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={intensity}
                    onChange={(e) => onIntensityChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-water focus:outline-none focus:ring-2 focus:ring-water/50"
                />

                <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium px-1">
                    <span>Dry</span>
                    <span>Moderate</span>
                    <span>Extreme</span>
                </div>
            </div>
        </div>
    );
}
