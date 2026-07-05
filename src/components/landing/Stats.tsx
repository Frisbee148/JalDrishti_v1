const stats = [
    {
        id: 1,
        label: "Hotspots Monitored",
        value: "445+",
        accent: "text-gold",
    },
    {
        id: 2,
        label: "Drainage Mapped",
        value: "1.1k km",
        accent: "text-primary",
    },
    {
        id: 3,
        label: "Predictive Capability",
        value: "Real-time",
        accent: "text-mauve",
    },
];

export function Stats() {
    return (
        <section className="border-y border-border bg-background-2">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:divide-x md:divide-border">
                    {stats.map((stat) => (
                        <div key={stat.id} className="text-center md:px-8">
                            <div className={`text-3xl font-semibold tracking-tight ${stat.accent}`}>
                                {stat.value}
                            </div>
                            <div className="mt-2 text-sm text-text-muted tracking-wide uppercase">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
