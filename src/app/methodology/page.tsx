"use client";

import { FileText, Database, Layers, GitBranch, Sigma } from "lucide-react";

export default function MethodologyPage() {
    return (
        <div className="min-h-screen bg-background p-8 space-y-12">
            <header className="max-w-4xl">
                <h1 className="text-3xl font-bold text-foreground mb-4">Scientific Methodology</h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Our waterlogging prediction framework implements the <strong>Spatial Regression Model</strong> approach
                    detailed in <em>"Predicting Urban Waterlogging Risks by Regression Models and Internet Open-Data Sources"</em>.
                    By integrating multi-source open data with advanced GIS analysis, we calculate risk probabilities with high confidence.
                </p>
            </header>

            {/* Framework Visual */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <GitBranch className="text-primary" /> Integrated Framework
                </h2>
                <div className="bg-surface border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                    {/* Simplified visual representation of Figure 4 from the paper */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative z-10">
                        <div className="space-y-4">
                            <div className="bg-black/40 border border-white/20 p-4 rounded-xl text-center">
                                <Database className="mx-auto mb-2 text-blue-400" />
                                <h3 className="text-white font-medium">Data Sources</h3>
                                <p className="text-xs text-slate-500 mt-1">Landsat, OpenStreetMap, DEM, Reports</p>
                            </div>
                        </div>

                        <div className="flex justify-center text-slate-600">→</div>

                        <div className="space-y-4">
                            <div className="bg-black/40 border border-white/20 p-4 rounded-xl text-center">
                                <Layers className="mx-auto mb-2 text-purple-400" />
                                <h3 className="text-white font-medium">Spatial Analysis</h3>
                                <p className="text-xs text-slate-500 mt-1">KDE (Density), HSA (Hotspots), Buffer (500m)</p>
                            </div>
                        </div>

                        <div className="flex justify-center text-slate-600">→</div>

                        <div className="space-y-4">
                            <div className="bg-black/40 border border-white/20 p-4 rounded-xl text-center">
                                <Sigma className="mx-auto mb-2 text-emerald-400" />
                                <h3 className="text-white font-medium">Regression Modeling</h3>
                                <p className="text-xs text-slate-500 mt-1">OLS (Global) & GWR (Local)</p>
                            </div>
                        </div>
                    </div>

                    {/* Background connector line */}
                    <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-20 -z-0"></div>
                </div>
            </section>

            {/* Key Explanatory Variables */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Layers className="text-primary" /> Explanatory Variables
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { title: "Impervious Surface % (ISP)", desc: "From Landsat 8. Positive correlation with waterlogging. Hard surfaces prevent infiltration.", coef: "+0.82" },
                        { title: "Road Density (Road-Dens)", desc: "From OpenStreetMap. Streets act as streams collecting runoff.", coef: "+0.65" },
                        { title: "Vegetation Index (NDVI)", desc: "Quantifies green cover. Strong negative correlation; vegetation aids retention.", coef: "-0.71" },
                        { title: "Population Density (POP-Dens)", desc: "High density often correlates with lower infrastructure per capita.", coef: "+0.58" },
                        { title: "Dist. to Water Bodies (DW-Dist)", desc: "Proximity to drainage/lakes reduces risk (negative correlation).", coef: "-0.45" },
                        { title: "Elevation (DEM)", desc: "Found to be statistically insignificant for flat terrains like Hanoi/Delhi.", coef: "N/A" },
                    ].map((item, i) => (
                        <div key={i} className="bg-surface border border-white/10 p-6 rounded-xl hover:bg-white/5 transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-white">{item.title}</h3>
                                <span className={`text-xs font-mono px-2 py-1 rounded ${item.coef.includes('+') ? 'bg-red-500/20 text-red-400' : item.coef.includes('-') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    β: {item.coef}
                                </span>
                            </div>
                            <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Data Sources Table */}
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Database className="text-primary" /> Open Data Sources
                </h2>
                <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-slate-300 font-medium">
                            <tr>
                                <th className="p-4">Data Type</th>
                                <th className="p-4">Format</th>
                                <th className="p-4">Source</th>
                                <th className="p-4">Application</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-400">
                            <tr>
                                <td className="p-4">Waterlogging Reports</td>
                                <td className="p-4 font-mono text-xs">Text/News</td>
                                <td className="p-4">Google Search / News APIs</td>
                                <td className="p-4">Dependent Variable (Y)</td>
                            </tr>
                            <tr>
                                <td className="p-4">Satellite Imagery</td>
                                <td className="p-4 font-mono text-xs">Raster (30m)</td>
                                <td className="p-4">USGS (Landsat 8 OLI/TIRS)</td>
                                <td className="p-4">Extracting ISP, NDVI, MNDWI</td>
                            </tr>
                            <tr>
                                <td className="p-4">Road Network</td>
                                <td className="p-4 font-mono text-xs">Shapefile</td>
                                <td className="p-4">OpenStreetMap (OSM)</td>
                                <td className="p-4">Calculating Road Density</td>
                            </tr>
                            <tr>
                                <td className="p-4">Topography</td>
                                <td className="p-4 font-mono text-xs">Raster</td>
                                <td className="p-4">ASTER Global DEM</td>
                                <td className="p-4">Slope analysis (though low impact)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
