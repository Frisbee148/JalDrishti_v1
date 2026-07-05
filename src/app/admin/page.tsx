"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, CheckCircle, Clock, MapPin, Truck, ExternalLink, RefreshCw, X, Eye, Image as ImageIcon, Navigation, ShieldAlert, ThumbsUp, ThumbsDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminDashboard() {
    const router = useRouter();
    const [notification, setNotification] = useState<string | null>(null);
    const [broadcasting, setBroadcasting] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<"none" | "high" | "low">("none");

    // Confidence below this % is too low to trust the "waterlogged" label.
    const CONFIDENCE_THRESHOLD = 40;
    const isWaterlogged = (r: any) =>
        !!r?.ai_analysis?.waterlogged && (r?.ai_analysis?.confidence ?? 0) >= CONFIDENCE_THRESHOLD;

    const severityRank = (severity?: string) =>
        severity === "High" ? 3 : severity === "Moderate" ? 2 : severity === "Low" ? 1 : 0;

    const resources = { heavyPumps: { available: 3, total: 5 }, suctionTankers: { available: 2, total: 4 }, responseTeams: { available: 4, total: 6 } };

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    // Fetch reports from backend
    const fetchReports = () => {
        setLoading(true);
        fetch("http://localhost:8000/reports?all=true")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setReports(data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const handleBroadcast = () => {
        setBroadcasting(true);
        setTimeout(() => {
            setBroadcasting(false);
            showNotification("Emergency Broadcast Sent to All Units & Public App");
        }, 1500);
    };

    const handleStatusUpdate = async (reportId: string, status: string) => {
        try {
            await fetch(`http://localhost:8000/reports/${reportId}/status?status=${status}`, {
                method: "PUT",
            });
            setReports(prev => prev.map(r =>
                r.id === reportId ? { ...r, admin_status: status } : r
            ));
            showNotification(`Report ${status === "approved" ? "Approved" : "Rejected"} Successfully`);
            if (selectedReport?.id === reportId) {
                setSelectedReport((prev: any) => prev ? { ...prev, admin_status: status } : null);
            }
        } catch {
            showNotification("Failed to update report status");
        }
    };

    const handleViewOnMap = (report: any) => {
        const { lat, lng } = report.coordinates;
        router.push(`/dashboard?flyTo=${lat},${lng}`);
    };

    const pendingReports = reports.filter(r => r.admin_status === "pending");
    const approvedReports = reports.filter(r => r.admin_status === "approved");
    const rejectedReports = reports.filter(r => r.admin_status === "rejected");

    const sortedReports = sortOrder === "none"
        ? reports
        : [...reports].sort((a, b) => {
            const diff = severityRank(a.ai_analysis?.severity) - severityRank(b.ai_analysis?.severity);
            return sortOrder === "high" ? -diff : diff;
        });

    const getSeverityColor = (severity: string) => {
        if (severity === "High") return "text-red-400 bg-red-500/10 border-red-500/30";
        if (severity === "Moderate") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
        return "text-green-400 bg-green-500/10 border-green-500/30";
    };

    const getMethodLabel = (method: string) => {
        if (method === "huggingface_clip") return "HuggingFace CLIP";
        if (method === "local_siglip") return "SigLIP Local";
        if (method === "local_opencv") return "OpenCV Local";
        if (method === "azure_api") return "Azure AI";
        return method;
    };

    return (
        <div className="min-h-screen bg-background p-8 relative">
            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-surface border border-emerald-500/50 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-top-2 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500 h-5 w-5" />
                    {notification}
                </div>
            )}

            {/* Report Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
                    <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Image */}
                        <div className="h-56 bg-black/50 relative overflow-hidden rounded-t-2xl">
                            {selectedReport.image_url && !selectedReport.image_url.includes("blob") ? (
                                <img src={selectedReport.image_url} alt="Report" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-text-muted">
                                    <ImageIcon className="mr-2 h-5 w-5" /> Image Unavailable
                                </div>
                            )}
                            <button onClick={() => setSelectedReport(null)} className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/70">
                                <X className="h-4 w-4" />
                            </button>
                            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                selectedReport.admin_status === "approved" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : selectedReport.admin_status === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            }`}>
                                {selectedReport.admin_status}
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Location */}
                            <div>
                                <div className="flex items-center gap-2 text-text-soft text-sm mb-1">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {selectedReport.location}
                                </div>
                                <div className="text-xs text-text-muted font-mono">
                                    Lat: {selectedReport.coordinates?.lat?.toFixed(4)}, Lng: {selectedReport.coordinates?.lng?.toFixed(4)}
                                </div>
                            </div>

                            {/* AI Analysis */}
                            <div className="bg-black/30 rounded-xl p-4 border border-border space-y-3">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-primary" /> AI Analysis
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-text-muted block text-xs">Waterlogged</span>
                                        <span className={isWaterlogged(selectedReport) ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                                            {isWaterlogged(selectedReport) ? "Yes" : "No"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-text-muted block text-xs">Confidence</span>
                                        <span className="text-white font-bold">{selectedReport.ai_analysis?.confidence}%</span>
                                    </div>
                                    <div>
                                        <span className="text-text-muted block text-xs">Severity</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${getSeverityColor(selectedReport.ai_analysis?.severity)}`}>
                                            {selectedReport.ai_analysis?.severity}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-text-muted block text-xs">Method</span>
                                        <span className="text-primary text-xs font-medium">{getMethodLabel(selectedReport.ai_analysis?.method)}</span>
                                    </div>
                                </div>
                                {selectedReport.ai_analysis?.estimated_depth && (
                                    <div className="text-xs text-text-muted">
                                        Est. Depth: <span className="text-white">{selectedReport.ai_analysis.estimated_depth}</span>
                                    </div>
                                )}
                            </div>

                            {/* Forensics */}
                            {selectedReport.ai_analysis?.forensics && (
                                <div className="bg-black/20 rounded-lg p-3 border border-border text-xs space-y-1">
                                    <span className="text-text-muted">Forensics:</span>
                                    <div className="text-text-soft">Source: {selectedReport.ai_analysis.forensics.source}</div>
                                    <div className="text-text-soft">Camera: {selectedReport.ai_analysis.forensics.camera}</div>
                                    {selectedReport.ai_analysis.forensics.is_duplicate && (
                                        <div className="text-red-400 font-bold">⚠ Duplicate Detected</div>
                                    )}
                                </div>
                            )}

                            {/* Votes */}
                            <div className="flex items-center gap-4 text-sm text-text-muted">
                                <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-emerald-400" /> {selectedReport.upvotes || 0}</span>
                                <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-red-400" /> {selectedReport.downvotes || 0}</span>
                                <span className="text-xs">Reporter: {selectedReport.reporter_id}</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="primary"
                                    className="flex-1 bg-primary/90 hover:bg-primary"
                                    onClick={() => handleViewOnMap(selectedReport)}
                                >
                                    <Navigation className="mr-2 h-4 w-4" /> View on Live Map
                                </Button>
                            </div>
                            {selectedReport.admin_status === "pending" && (
                                <div className="flex gap-3">
                                    <Button
                                        variant="primary"
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => handleStatusUpdate(selectedReport.id, "approved")}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                                        onClick={() => handleStatusUpdate(selectedReport.id, "rejected")}
                                    >
                                        <X className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <span className="bg-red-500/10 text-red-500 p-2 rounded-lg"><AlertOctagon /></span>
                        Command Center
                    </h1>
                    <p className="text-text-muted mt-2">Live incident management and resource allocation.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={fetchReports}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                    </Button>
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

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "Total Reports", value: reports.length, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Pending Review", value: pendingReports.length, color: "text-amber-400", bg: "bg-amber-500/10" },
                    { label: "Approved", value: approvedReports.length, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Rejected", value: rejectedReports.length, color: "text-red-400", bg: "bg-red-500/10" },
                ].map((stat, i) => (
                    <div key={i} className="bg-surface border border-border rounded-xl p-5">
                        <p className="text-text-muted text-sm">{stat.label}</p>
                        <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Report Feed */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                        <h2 className="text-xl font-bold text-white">
                            Waterlogging Reports
                            {pendingReports.length > 0 && (
                                <span className="ml-3 text-sm font-normal text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                                    {pendingReports.length} pending review
                                </span>
                            )}
                        </h2>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-text-muted flex items-center gap-1">
                                <ArrowUpDown className="h-3.5 w-3.5" /> Severity
                            </span>
                            {([
                                { key: "none", label: "Default" },
                                { key: "high", label: "High → Low" },
                                { key: "low", label: "Low → High" },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.key}
                                    onClick={() => setSortOrder(opt.key)}
                                    className={`px-3 py-1 rounded-full border transition-colors ${
                                        sortOrder === opt.key
                                            ? "bg-primary/20 text-primary border-primary/40"
                                            : "text-text-muted border-border hover:bg-white/5"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center p-12 text-text-muted bg-surface border border-border rounded-2xl">
                            <RefreshCw className="mx-auto h-12 w-12 mb-4 opacity-20 animate-spin" />
                            <p>Loading reports...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center p-12 text-text-muted bg-surface border border-border rounded-2xl">
                            <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>No reports yet. Reports will appear here when users submit waterlogging images.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sortedReports.map((report) => (
                                <div
                                    key={report.id}
                                    className={`bg-surface border ${
                                        report.admin_status === "pending" ? "border-amber-500/30" :
                                        report.admin_status === "approved" ? "border-emerald-500/30" :
                                        "border-border"
                                    } rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-5 transition-all hover:bg-white/5 cursor-pointer`}
                                    onClick={() => setSelectedReport(report)}
                                >
                                    {/* Thumbnail */}
                                    <div className="h-20 w-20 rounded-xl bg-black/50 overflow-hidden shrink-0 border border-border">
                                        {report.image_url && !report.image_url.includes("blob") ? (
                                            <img src={report.image_url} alt="Report" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-text-muted">
                                                <ImageIcon className="h-5 w-5" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                                report.admin_status === "approved" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                                report.admin_status === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                                "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                            }`}>
                                                {report.admin_status}
                                            </span>
                                            {report.is_spam && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold">SPAM</span>
                                            )}
                                            {report.ai_analysis?.severity && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getSeverityColor(report.ai_analysis.severity)}`}>
                                                    {report.ai_analysis.severity} Severity
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-bold text-white truncate">{report.location || "Unknown Location"}</h3>
                                        <div className="flex items-center gap-4 mt-1.5 text-sm text-text-muted">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(report.timestamp).toLocaleString()}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {report.coordinates?.lat?.toFixed(3)}, {report.coordinates?.lng?.toFixed(3)}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-primary/50 text-primary hover:bg-primary/10"
                                            onClick={() => handleViewOnMap(report)}
                                        >
                                            <Navigation className="mr-1.5 h-3 w-3" /> View on Map
                                        </Button>
                                        {report.admin_status === "pending" && (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={() => handleStatusUpdate(report.id, "approved")}
                                                >
                                                    <CheckCircle className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                    onClick={() => handleStatusUpdate(report.id, "rejected")}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
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

                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-medium text-text-soft">Available Units</h3>
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
                                { name: "Suction Tankers", ...resources.suctionTankers, color: "bg-mauve" },
                                { name: "Response Teams", ...resources.responseTeams, color: "bg-emerald-500" },
                            ].map((res, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-text-muted">{res.name}</span>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
