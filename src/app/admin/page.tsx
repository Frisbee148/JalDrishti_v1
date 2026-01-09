"use client";

import { useEffect, useState } from "react";
import { Button, cn } from "@/components/ui/Button";
import { CheckCircle2, XCircle, AlertTriangle, UserCheck, ShieldCheck } from "lucide-react";

export default function AdminPage() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await fetch("http://localhost:8000/reports");
            const data = await res.json();
            // Show all for admin
            setReports(data);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await fetch(`http://localhost:8000/reports/${id}/status?status=${status}`, {
                method: "PUT",
            });
            fetchReports(); // Refresh
        } catch (error) {
            console.error("Update failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-background border-l border-white/5 p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-400 mb-8">Review and verify AI-reported waterlogging incidents.</p>

            <div className="grid gap-6">
                {reports.length === 0 && <p className="text-slate-500">No reports found.</p>}

                {reports.map((report) => (
                    <div key={report.id} className="bg-surface border border-white/10 rounded-xl p-6 flex flex-col md:flex-row gap-6">
                        {/* Status Badge */}
                        <div className="md:w-1/4">
                            <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4",
                                report.admin_status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                                    report.admin_status === "rejected" ? "bg-red-500/20 text-red-400" :
                                        "bg-amber-500/20 text-amber-400"
                            )}>
                                {report.admin_status === "approved" ? <ShieldCheck className="h-3 w-3" /> :
                                    report.admin_status === "rejected" ? <XCircle className="h-3 w-3" /> :
                                        <AlertTriangle className="h-3 w-3" />}
                                {report.admin_status.toUpperCase()}
                            </div>

                            <div className="text-sm text-slate-400">
                                <p>Report ID: <span className="text-slate-200 font-mono">{report.id.slice(0, 8)}</span></p>
                                <p>Date: {new Date(report.timestamp).toLocaleDateString()}</p>
                                <p>Loc: {report.location}</p>
                            </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="md:w-2/4 border-l border-white/5 pl-6">
                            <h3 className="text-lg font-semibold text-white mb-2">AI Verdict</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Confidence</p>
                                    <p className="text-emerald-400 font-medium">{report.ai_analysis.confidence}%</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Severity</p>
                                    <p className="text-white">{report.ai_analysis.severity}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Depth Est.</p>
                                    <p className="text-blue-400">{report.ai_analysis.estimated_depth}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Source</p>
                                    <p className={cn("font-medium",
                                        report.ai_analysis.forensics.source.includes("Web") ? "text-red-400" : "text-emerald-400"
                                    )}>
                                        {report.ai_analysis.forensics.source}
                                    </p>
                                </div>
                            </div>

                            {report.is_spam && (
                                <div className="mt-3 bg-red-500/10 border border-red-500/20 p-2 rounded text-xs text-red-300">
                                    ⚠️ FLAGGED AS SPAM/FAKE BY FORENSICS
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="md:w-1/4 flex flex-col justify-center gap-3">
                            {report.admin_status === "pending" && (
                                <>
                                    <Button
                                        variant="primary"
                                        className="bg-emerald-600 hover:bg-emerald-700 w-full"
                                        onClick={() => updateStatus(report.id, "approved")}
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                    </Button>
                                    <Button
                                        variant="primary"
                                        className="w-full bg-red-600 hover:bg-red-700"
                                        onClick={() => updateStatus(report.id, "rejected")}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                </>
                            )}

                            {report.admin_status !== "pending" && (
                                <Button variant="secondary" className="w-full" disabled>
                                    Action Taken
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
