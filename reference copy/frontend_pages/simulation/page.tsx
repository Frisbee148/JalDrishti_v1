"use client";

import { useState, useEffect } from "react";
import { Sliders, RefreshCw, CloudRain, Droplets, Wind, Thermometer, BrainCircuit, CheckCircle2, Map as MapIcon, AlertTriangle, X, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FactorMap } from "@/components/analytics/FactorMap";

export default function SimulationPage() {
    // --- Weather Model State ---
    const [temperature, setTemperature] = useState(30); // Celsius
    const [humidity, setHumidity] = useState(75); // %
    const [pressure, setPressure] = useState(1005); // hPa
    const [cloudCover, setCloudCover] = useState(60); // %

    // --- Training State ---
    const [isTraining, setIsTraining] = useState(false);
    const [modelTrained, setModelTrained] = useState(false);
    const [trainingProgress, setTrainingProgress] = useState(0);

    // --- Rainfall Output ---
    const [predictedRainfall, setPredictedRainfall] = useState(0); // mm

    // --- Urban State (Regression Variables) ---
    const [isp, setISP] = useState(50); // Impervious Surface %
    const [roadDens, setRoadDens] = useState(10); // km/km2
    const [ndvi, setNDVI] = useState(0.4); // 0 to 1
    const [popDens, setPopDens] = useState(15000); // people/km2
    const [dwDist, setDWDist] = useState(500); // meters

    const [locations, setLocations] = useState<any[]>([]);
    const [wardRisks, setWardRisks] = useState<Record<string, string>>({});
    const [wardScores, setWardScores] = useState<Record<string, number>>({});
    const [showCriticalList, setShowCriticalList] = useState(false);

    // --- Logic: Rainfall Prediction (Real AI Backend) ---
    const [backendError, setBackendError] = useState(false);

    const predictRainfall = async () => {
        try {
            const response = await fetch("http://localhost:8000/predict", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": "jal-drishti-secure-key-2025" // In prod, use process.env.NEXT_PUBLIC_API_KEY
                },
                body: JSON.stringify({
                    temperature,
                    humidity,
                    pressure,
                    cloud_cover: cloudCover,
                    // Pass Urban Factors to influence the model
                    isp,
                    road_density: roadDens,
                    ndvi,
                    population_density: popDens
                })
            });

            if (!response.ok) throw new Error("Backend connection failed");

            const data = await response.json();
            setPredictedRainfall(Math.round(data.rainfall_mm));
            setLocations(data.locations || []);
            setWardRisks(data.ward_risks || {});
            setWardScores(data.ward_scores || {});
            setBackendError(false);
        } catch (e) {
            console.error("Prediction failed:", e);
            setBackendError(true);
            // Fallback to simulation if backend is down, so app doesn't break
            // setPredictedRainfall(simulateFallbackRainfall());
        }
    };



    // --- Logic: Waterlogging Risk Model ---
    // Y (Risk) = β0 + UrbanFactors + RainfallFactor
    const calculateRisk = () => {
        // If we have backend location data, show the City-Average Risk
        if (locations.length > 0) {
            const totalRisk = locations.reduce((acc, loc) => acc + loc.risk_score, 0);
            return Math.round(totalRisk / locations.length);
        }

        // Fallback: Manual Simulation based on sliders
        const n_isp = isp / 100;
        const n_road = roadDens / 20;
        const n_ndvi = ndvi;
        const n_pop = popDens / 50000;
        const n_dist = dwDist / 2000;
        const n_rain = Math.min(1, predictedRainfall / 150);

        let score = (0.4 * n_isp) + (0.3 * n_road) + (0.3 * n_pop) - (0.4 * n_ndvi) - (0.2 * n_dist) + (0.8 * n_rain);
        score = (score + 0.2) * 65;

        return Math.min(100, Math.max(0, Math.round(score)));
    };

    const riskScore = calculateRisk();
    const isCityAverage = locations.length > 0;

    // Trigger prediction when weather changes
    useEffect(() => {
        const timer = setTimeout(() => {
            predictRainfall();
        }, 500); // Debounce
        return () => clearTimeout(timer);
    }, [temperature, humidity, pressure, cloudCover, modelTrained]);


    // --- Training Handler ---
    const handleTrainModel = async (file?: File) => {
        setIsTraining(true);
        setModelTrained(false);
        setTrainingProgress(0);

        if (!file) {
            // Simulated training if no file (legacy button)
            const interval = setInterval(() => {
                setTrainingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setIsTraining(false);
                        setModelTrained(true);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);
            return;
        }

        // Real Backend Training
        try {
            const formData = new FormData();
            formData.append("file", file);

            // Fake progress for UX while waiting
            const progInterval = setInterval(() => setTrainingProgress(p => p < 90 ? p + 5 : p), 200);

            const response = await fetch("http://localhost:8000/train", {
                method: "POST",
                body: formData
            });

            clearInterval(progInterval);

            if (response.ok) {
                setTrainingProgress(100);
                setTimeout(() => {
                    setIsTraining(false);
                    setModelTrained(true);
                }, 500);
                // Trigger a new prediction with the trained model
                predictRainfall();
            } else {
                alert("Training failed. Check CSV format.");
                setIsTraining(false);
            }

        } catch (e) {
            alert("Backend not reachable. Run 'python backend/server.py'");
            setIsTraining(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-foreground mb-4">AI Prediction & Waterlogging Simulator</h1>
                <p className="text-slate-400 text-lg">
                    Train a rainfall prediction model and simulate waterlogging risks by adjusting weather and urban parameters.
                </p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">

                {/* COLUMN 1: Weather & Rainfall Model */}
                <div className="space-y-6">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                            <CloudRain className="mr-2 text-cyan-400" /> Weather Parameters
                        </h3>

                        <div className="space-y-6">
                            {/* Cloud Cover */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 flex items-center"><CloudRain size={16} className="mr-2" /> Cloud Cover</label>
                                    <span className="text-cyan-400 font-mono">{cloudCover}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={cloudCover} onChange={(e) => setCloudCover(parseInt(e.target.value))} className="w-full accent-cyan-500 h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            {/* Humidity */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 flex items-center"><Droplets size={16} className="mr-2" /> Humidity</label>
                                    <span className="text-blue-400 font-mono">{humidity}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={humidity} onChange={(e) => setHumidity(parseInt(e.target.value))} className="w-full accent-blue-500 h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            {/* Pressure */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 flex items-center"><Wind size={16} className="mr-2" /> Pressure</label>
                                    <span className="text-indigo-400 font-mono">{pressure} hPa</span>
                                </div>
                                <input type="range" min="950" max="1050" value={pressure} onChange={(e) => setPressure(parseInt(e.target.value))} className="w-full accent-indigo-500 h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            {/* Temp */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 flex items-center"><Thermometer size={16} className="mr-2" /> Temperature</label>
                                    <span className="text-amber-400 font-mono">{temperature}°C</span>
                                </div>
                                <input type="range" min="0" max="50" value={temperature} onChange={(e) => setTemperature(parseInt(e.target.value))} className="w-full accent-amber-500 h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10">
                            {/* Simplified View: Auto-prediction is always active via useEffect */}
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                                <div className="text-blue-200 text-sm mb-1 uppercase tracking-wider">Predicted Rainfall</div>
                                <div className="text-4xl font-bold text-white mb-2">
                                    {predictedRainfall} <span className="text-lg text-blue-400">mm</span>
                                </div>

                                {backendError ? (
                                    <div className="flex items-center justify-center text-xs text-red-400 mt-2">
                                        ⚠️ Connection Error (Backend Offline)
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center text-xs text-green-400 md:gap-1 mt-2">
                                        <CheckCircle2 size={12} className="mr-1" /> AI Model Active
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-slate-500 text-center mt-3">
                                Prediction is based on the Deep Learning model trained on historical data.
                            </p>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: Urban Factors */}
                <div className="space-y-6">
                    <div className="bg-surface border border-white/10 rounded-xl p-6 relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <Sliders className="mr-2 text-primary" /> Urban Factors
                            </h3>
                            {isCityAverage && (
                                <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-slate-300">
                                    (Used for Manual Simulation)
                                </span>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* ISP */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 text-sm">Impervious Surface (ISP)</label>
                                    <span className="text-white font-mono">{isp}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={isp} onChange={(e) => setISP(parseInt(e.target.value))} className="w-full accent-primary h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            {/* Road Density */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 text-sm">Road Density</label>
                                    <span className="text-white font-mono">{roadDens} <span className="text-xs text-slate-500">km/km²</span></span>
                                </div>
                                <input type="range" min="0" max="20" step="0.5" value={roadDens} onChange={(e) => setRoadDens(parseFloat(e.target.value))} className="w-full accent-primary h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            {/* NDVI */}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-slate-300 text-sm">Vegetation (NDVI)</label>
                                    <span className="text-emerald-400 font-mono">{ndvi}</span>
                                </div>
                                <input type="range" min="0" max="1" step="0.01" value={ndvi} onChange={(e) => setNDVI(parseFloat(e.target.value))} className="w-full accent-emerald-500 h-2 bg-black/50 rounded-lg cursor-pointer" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Population</label>
                                    <input type="number" value={popDens} onChange={(e) => setPopDens(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-slate-400">Dist. to Water</label>
                                    <input type="number" value={dwDist} onChange={(e) => setDWDist(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-white text-sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: Result */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 bg-surface border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
                            {isCityAverage ? "City Average Risk" : "Simulated Risk"}
                        </h2>

                        <div className="relative inline-flex items-center justify-center">
                            <svg className="w-48 h-48 transform -rotate-90">
                                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-black/30" />
                                <circle
                                    cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="10" fill="transparent"
                                    className={`${riskScore > 75 ? 'text-red-500' : riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-500`}
                                    strokeDasharray={2 * Math.PI * 88}
                                    strokeDashoffset={2 * Math.PI * 88 * (1 - riskScore / 100)}
                                    // Make sure it doesn't go negative or wrap poorly
                                    style={{ strokeDashoffset: Math.max(0, 2 * Math.PI * 88 * (1 - riskScore / 100)) }}
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className={`text-5xl font-bold ${riskScore > 75 ? 'text-red-500' : riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {riskScore}%
                                </span>
                                <span className="text-xs text-slate-500 mt-1">PROBABILITY</span>
                            </div>
                        </div>

                        {/* Critical Spots Alert */}
                        {isCityAverage && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div
                                    className="bg-red-500/20 border border-red-500/30 p-2 rounded flex flex-col items-center cursor-pointer hover:bg-red-500/30 transition-colors"
                                    onClick={() => setShowCriticalList(true)}
                                >
                                    <span className="text-red-400 font-bold text-lg">
                                        {locations.filter(l => l.status === "High").length}
                                    </span>
                                    <span className="text-red-200">Critical Spots</span>
                                </div>
                                <div className="bg-amber-500/20 border border-amber-500/30 p-2 rounded flex flex-col items-center">
                                    <span className="text-amber-400 font-bold text-lg">
                                        {locations.filter(l => l.status === "Medium").length}
                                    </span>
                                    <span className="text-amber-200">Alert Areas</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-black/20 rounded-lg p-4 text-left space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-sm text-slate-400">Data Source</span>
                                <span className="text-sm text-slate-200 text-right">
                                    {isCityAverage ? "CSV / Real-Time Locations" : "Manual Parameters"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-sm text-slate-400">Rainfall Contribution</span>
                                <span className={predictedRainfall > 50 ? "text-red-400 font-bold" : "text-slate-200"}>
                                    {predictedRainfall > 150 ? "CRITICAL" : predictedRainfall > 50 ? "HIGH" : "LOW"}
                                </span>
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg border ${riskScore > 75 ? 'bg-red-500/10 border-red-500/30' : riskScore > 40 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <div className="font-bold text-white mb-1">
                                {riskScore > 75 ? '⚠️ SEVERE WATERLOGGING EXPECTED' : riskScore > 40 ? '⚠️ MODERATE RISK' : '✅ LOW RISK'}
                            </div>
                            <div className="text-xs text-slate-300 opacity-80">
                                {riskScore > 75
                                    ? "Immediate drainage action required. High rainfall combined with poor urban factors."
                                    : "Monitor situation. Some localized accumulation possible."}
                            </div>
                        </div>

                        <Button className="w-full" variant="outline" onClick={() => { setTemperature(30); setHumidity(75); setISP(50); setPredictedRainfall(0); setModelTrained(false); }}>
                            <RefreshCw size={16} className="mr-2" /> Reset Simulation
                        </Button>
                    </div>
                </div>

            </div>

            {/* Spatial Impact Map Section */}
            <div className="mt-8 border-t border-white/10 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Map 1: Precision Spot Analysis */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <MapIcon className="mr-2 text-primary" /> Precision Spot Analysis
                    </h3>
                    <p className="text-sm text-slate-400">Interactive spot-wise risk assessment. Click dots for details.</p>

                    <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/20 relative group">
                        <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur border border-white/10 px-4 py-2 rounded-lg text-white shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-xs text-slate-300">Current Prediction</div>
                            <div className="font-bold">{predictedRainfall} mm</div>
                        </div>
                        <FactorMap
                            activeFactor="simulation"
                            dynamicRainfall={predictedRainfall}
                            locations={locations}
                            wardRisks={wardRisks}
                            wardScores={wardScores}
                            activeView="points" // SHOW ONLY POINTS
                        />
                    </div>
                </div>

                {/* Map 2: Regional Overview */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <BrainCircuit className="mr-2 text-blue-400" /> Regional Vulnerability
                    </h3>
                    <p className="text-sm text-slate-400">Aggregated ward-level risk distribution.</p>

                    <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/20 relative">
                        {/* Legend for Regions */}
                        <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur border border-white/10 px-3 py-2 rounded-lg text-white shadow-xl">
                            <div className="flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-800 rounded-sm"></div> Sever</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> High</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-400 rounded-sm"></div> Med</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Low</div>
                            </div>
                        </div>

                        <FactorMap
                            activeFactor="simulation"
                            dynamicRainfall={predictedRainfall}
                            locations={locations}
                            wardRisks={wardRisks}
                            wardScores={wardScores}
                            activeView="regions" // SHOW ONLY REGIONS
                        />
                    </div>
                </div>

            </div>
            {/* Critical Spots Modal */}
            {showCriticalList && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl shadow-red-900/20">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/10 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-red-400 flex items-center">
                                    <AlertTriangle className="mr-2" /> Critical Waterlogging Spots
                                </h3>
                                <p className="text-xs text-red-200/70 mt-1">High-risk locations requiring immediate attention</p>
                            </div>
                            <button onClick={() => setShowCriticalList(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {locations.filter(l => l.status === "High").length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    No critical spots detected at current rainfall levels.
                                </div>
                            ) : (
                                locations.filter(l => l.status === "High").map((loc, idx) => (
                                    <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-red-500/20 p-3 rounded-lg text-red-400 font-bold text-lg min-w-[60px] text-center border border-red-500/10">
                                                {Math.round(loc.risk_score)} <span className="text-[10px] block font-normal opacity-70">SCORE</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-200 text-lg">{loc.ward || "Unknown Ward"}</h4>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                                    <span className="flex items-center gap-1"><MapPin size={12} /> {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
                                                    {loc.population && loc.population !== "N/A" && (
                                                        <span className="flex items-center gap-1"><Users size={12} /> Pop: {loc.population}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs border border-red-500/20 font-medium">
                                                SEVERE
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-black/20 rounded-b-2xl flex justify-end">
                            <Button variant="ghost" onClick={() => setShowCriticalList(false)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
