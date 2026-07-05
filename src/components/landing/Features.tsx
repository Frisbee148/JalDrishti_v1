const features = [
    {
        index: "01",
        title: "PSI Index",
        description:
            "The Predictive Saturation Index calculates soil absorption limits against forecasted rainfall intensity.",
    },
    {
        index: "02",
        title: "3D Digital Twin",
        description:
            "High-fidelity extrusion models of Delhi's wards visualizing elevation-based flood risks in real time.",
    },
    {
        index: "03",
        title: "Citizen Reporting",
        description:
            "AI-verified incident reporting lets citizens validate model predictions with on-ground data.",
    },
];

export function Features() {
    return (
        <section className="py-28">
            <div className="container mx-auto px-4">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <p className="text-xs font-medium tracking-widest uppercase text-primary mb-4">
                        How it works
                    </p>
                    <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-text-strong">
                        Built on three pillars
                    </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:-translate-y-1 hover:border-border-hover hover:bg-surface-hover hover:shadow-2xl hover:shadow-black/30"
                        >
                            {/* Editorial index marker instead of icon */}
                            <div className="mb-8 flex items-baseline gap-3">
                                <span className="text-sm font-mono text-primary tracking-wider">
                                    {feature.index}
                                </span>
                                <span className="h-px flex-1 bg-border group-hover:bg-border-hover transition-colors duration-300" />
                            </div>

                            <h3 className="mb-3 text-xl font-semibold tracking-tight text-text-strong">
                                {feature.title}
                            </h3>
                            <p className="text-text-muted leading-relaxed">
                                {feature.description}
                            </p>

                            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 glow-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
