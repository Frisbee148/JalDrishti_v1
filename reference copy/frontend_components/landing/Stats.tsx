import { AlertTriangle, MapPin, BarChart3 } from "lucide-react";

const stats = [
    {
        id: 1,
        label: "Hotspots Monitored",
        value: "445+",
        icon: AlertTriangle,
        color: "text-red-500",
    },
    {
        id: 2,
        label: "Drainage Mapped",
        value: "1.1k km",
        icon: MapPin,
        color: "text-water",
    },
    {
        id: 3,
        label: "Predictive Capability",
        value: "Real-time",
        icon: BarChart3,
        color: "text-primary",
    },
];

export function Stats() {
    return (
        <section className="border-y border-white/5 bg-surface/30 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.id} className="flex items-center justify-center gap-4">
                            <div className={`p-3 rounded-xl bg-background border border-white/5 ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm text-slate-400">{stat.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
