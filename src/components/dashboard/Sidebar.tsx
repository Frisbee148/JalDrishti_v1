"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Map, AlertTriangle, LayoutDashboard, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/components/ui/Button";
import { useWardRisk } from "@/context/WardRiskContext";

const navItems = [
    { href: "/dashboard", label: "Live Map", icon: Map },
    { href: "/admin", label: "Admin Console", icon: LayoutDashboard },
    { href: "/reports", label: "Report Incident", icon: AlertTriangle },
    { href: "/methodology", label: "Methodology", icon: BookOpen },
];

const riskCls = (score: number) =>
    score > 65
        ? "text-red-400 bg-red-500/10 border-red-500/30"
        : score > 35
        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

export function Sidebar() {
    const pathname = usePathname();
    const { wardScores, rainfall } = useWardRisk();

    const topRiskWards = Object.entries(wardScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-border bg-surface/50 backdrop-blur-xl flex flex-col z-40">
            <div className="h-16 flex items-center px-6 border-b border-border">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-background group-hover:bg-primary-hover transition-colors">
                        <Droplets className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">JalDrishti</span>
                </Link>
            </div>

            {topRiskWards.length > 0 && (
                <div className="p-4 border-b border-border">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        Top Risk Wards
                    </h3>
                    <p className="text-xs text-text-muted mb-2">
                        {rainfall > 0 ? `@ ${rainfall}mm rainfall` : "Move rain slider"}
                    </p>
                    <div className="space-y-1.5">
                        {topRiskWards.map(([ward, score], i) => (
                            <div key={ward} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/20 border border-border">
                                <span className="text-xs font-mono text-text-muted w-3">{i + 1}</span>
                                <span className="text-xs text-white flex-1 truncate capitalize">{ward.toLowerCase()}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold border ${riskCls(score)}`}>
                                    {score}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/20 text-white border border-primary/20"
                                    : "text-text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-text-muted")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="rounded-xl bg-background/50 border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">System Active</span>
                    </div>
                    <p className="text-xs text-text-muted mb-1">IMD Weather Feed: <span className="text-emerald-400">Connected</span></p>
                    <p className="text-xs text-text-muted">Last Update: <span className="text-text-soft">Just now</span></p>
                </div>
            </div>
        </aside>
    );
}
