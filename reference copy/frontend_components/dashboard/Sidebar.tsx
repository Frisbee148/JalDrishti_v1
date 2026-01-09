"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Map, AlertTriangle, History, Info, PieChart, ShieldAlert, FileText, Sliders } from "lucide-react";
import { cn } from "@/components/ui/Button";

const navItems = [
    { href: "/dashboard", label: "Live Map", icon: Map },
    { href: "/reports", label: "Report Incident", icon: AlertTriangle },
    { href: "/analytics", label: "Analytics", icon: PieChart },
    { href: "/methodology", label: "Methodology", icon: FileText },
    { href: "/simulation", label: "Risk Simulator", icon: Sliders },
    { href: "/admin", label: "Admin Console", icon: ShieldAlert },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-surface/50 backdrop-blur-xl flex flex-col z-40">
            <div className="h-16 flex items-center px-6 border-b border-white/5">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white group-hover:bg-violet-600 transition-colors">
                        <Droplets className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">JalDrishti</span>
                </Link>
            </div>

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
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-500")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className="rounded-xl bg-background/50 border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">System Active</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">IMD Weather Feed: <span className="text-emerald-400">Connected</span></p>
                    <p className="text-xs text-slate-400">Last Update: <span className="text-slate-300">Just now</span></p>
                </div>
            </div>
        </aside>
    );
}
