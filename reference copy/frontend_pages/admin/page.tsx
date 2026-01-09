"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // [FIX]
import { AlertOctagon, CheckCircle, Clock, MapPin, Truck, ExternalLink, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useIncidents } from "@/context/IncidentContext";

export default function AdminDashboard() {
    const router = useRouter(); // [FIX]
    const { incidents, dispatches, resources, updateIncidentStatus, deleteIncident } = useIncidents();
    const [notification, setNotification] = useState<string | null>(null);
    const [broadcasting, setBroadcasting] = useState(false);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleBroadcast = () => {
        setBroadcasting(true);
        // Simulate broadcast delay
        setTimeout(() => {
            setBroadcasting(false);
            showNotification("Emergency Broadcast Sent to All Units & Public App");
        }, 1500);
    };

    const handleVerify = (id: string) => {
        showNotification(`Incident ${id} Verified via CCTV Feed`);
    };

    const handleDispatch = (id: string) => {
        updateIncidentStatus(id, "Assigned");
        showNotification(`Response Team Dispatched to Incident ${id}`);
    };

    const handleResolve = (id: string) => {
        updateIncidentStatus(id, "Resolved");
        showNotification(`Incident ${id} Marked as Resolved`);
    };

    const handleArchive = (id: string) => {
        deleteIncident(id);
        showNotification(`Incident ${id} Archived`);
    };

    // reset removed as it is handled by context initialization logic or can be re-added as a utility if needed later

    return (
        <div className="min-h-screen bg-background p-8 relative">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-surface border border-emerald-500/50 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-top-2 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500 h-5 w-5" />
                    {notification}
                </div>
            )}

            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <span className="bg-red-500/10 text-red-500 p-2 rounded-lg"><AlertOctagon /></span>
                        Command Center
                    </h1>
                    <p className="text-slate-400 mt-2">Live incident management and resource allocation.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="primary"
                        className={`bg-red-600 hover:bg-red-700 ${broadcasting ? 'animate-pulse' : ''}`}
                        onClick={handleBroadcast}
                        disabled={broadcasting}
                    >
                        {broadcasting ? "Broadcasting..." : "Emergency Broadcast"}
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Incident Feed */}
                <div className="xl:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Active Incidents (Live)</h2>

                    {incidents.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 bg-surface border border-white/5 rounded-2xl">
                            <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>No active incidents. Good work!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {incidents.map((inc, i) => (
                                <div key={inc.id} className={`bg-surface border ${inc.severe ? 'border-red-500/50' : 'border-white/10'} rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 transition-all hover:bg-white/5 animate-in fade-in slide-in-from-bottom-2`}>
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${inc.severe ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                        <AlertOctagon />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-mono text-slate-500">{inc.id}</span>
                                            {inc.severe && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/20">CRITICAL</span>}
                                        </div>
                                        <h3 className="text-lg font-bold text-white">{inc.type} at {inc.loc}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {inc.time}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> Zone {i + 4}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        {inc.status === "New" ? (
                                            <>
                                                <Button variant="outline" size="sm" onClick={() => handleVerify(inc.id)}>Verify</Button>
                                                <Button variant="primary" size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => handleDispatch(inc.id)}>Dispatch Team</Button>
                                            </>
                                        ) : inc.status === "Assigned" ? (
                                            <>
                                                <Button variant="outline" size="sm" onClick={() => showNotification(`Viewing details for ${inc.id}...`)}>View Details</Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20"
                                                    onClick={() => handleResolve(inc.id)}
                                                >
                                                    Mark Resolved
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => handleArchive(inc.id)}>Archive</Button>
                                                <div className="flex items-center gap-2 text-emerald-400 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                    <CheckCircle size={16} /> <span>Resolved</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Resource Status Sidebar */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Resource Status</h2>

                    <div className="bg-surface border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-medium text-slate-300">Available Units</h3>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="text-primary text-sm hover:underline flex items-center gap-1"
                            >
                                View Map <ExternalLink size={12} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {[
                                { name: "Heavy Pumps", ...resources.heavyPumps, color: "bg-blue-500" },
                                { name: "Suction Tankers", ...resources.suctionTankers, color: "bg-purple-500" },
                                { name: "Response Teams", ...resources.responseTeams, color: "bg-emerald-500" },
                            ].map((res, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">{res.name}</span>
                                        <span className="text-white font-mono">{res.available}/{res.total}</span>
                                    </div>
                                    <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                                        <div
                                            className={`${res.color} h-full transition-all duration-500`}
                                            style={{ width: `${(res.available / res.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <h3 className="font-medium text-slate-300 mb-4">Recent Dispatches</h3>
                            <div className="space-y-4">
                                {dispatches.slice(0, 3).map((dispatch) => (
                                    <div key={dispatch.id} className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2">
                                        <Truck className="text-slate-500 shrink-0" size={18} />
                                        <div>
                                            <p className="text-slate-300"><span className="text-white font-medium">{dispatch.team}</span> {dispatch.action}</p>
                                            <p className="text-slate-500 text-xs mt-1">ETA: {dispatch.eta} • {dispatch.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                                {dispatches.length === 0 && (
                                    <p className="text-slate-500 text-sm italic">No recent dispatch activity.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
