"use client";

import { useEffect, useState } from "react";
import { Button, cn } from "@/components/ui/Button";
import { ThumbsUp, ThumbsDown, User, MapPin } from "lucide-react";

export default function CommunityPage() {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        // Fetch only approved or pending (non-rejected)
        fetch("http://localhost:8000/reports")
            .then(res => res.json())
            .then(data => {
                const visible = data.filter((r: any) => r.admin_status !== "rejected" && !r.is_spam);
                setReports(visible);
            });
    }, []);

    const sendReaction = async (id: string, type: string) => {
        await fetch(`http://localhost:8000/reports/${id}/react`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type }),
        });

        // Optimistic update
        setReports(prev => prev.map(r => {
            if (r.id === id) {
                return {
                    ...r,
                    upvotes: type === "agree" ? r.upvotes + 1 : r.upvotes,
                    downvotes: type === "disagree" ? r.downvotes + 1 : r.downvotes
                };
            }
            return r;
        }));
    };

    return (
        <div className="min-h-screen bg-background border-l border-white/5 p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold text-white mb-2">Community Feed</h1>
            <p className="text-slate-400 mb-8">Crowdsourced validation of waterlogging reports.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <div key={report.id} className="bg-surface border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
                        <div className="h-48 bg-black/50 relative flex items-center justify-center overflow-hidden">
                            {report.image_url && !report.image_url.includes("blob") ? (
                                <img src={report.image_url} alt="Incident Report" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-slate-600 italic">Image Unavailable</div>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center text-slate-300 text-sm mb-1">
                                        <MapPin className="h-3 w-3 mr-1 text-primary" />
                                        {report.location}
                                    </div>
                                    <div className="flex items-center text-slate-500 text-xs">
                                        <User className="h-3 w-3 mr-1" />
                                        Reporter: {report.reporter_id}
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                                    report.admin_status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
                                )}>
                                    {report.admin_status === "approved" ? "Verified" : "Pending Verify"}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                                <span className="text-xs text-slate-500">Is this report accurate?</span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="h-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => sendReaction(report.id, "agree")}>
                                        <ThumbsUp className="h-3 w-3 mr-1.5" /> {report.upvotes}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => sendReaction(report.id, "disagree")}>
                                        <ThumbsDown className="h-3 w-3 mr-1.5" /> {report.downvotes}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
