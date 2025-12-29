import { Layers, CloudLightning, Users } from "lucide-react";

const features = [
    {
        title: "PSI Index",
        description: "The Predictive Saturation Index (PSI) calculates soil absorption limits against forecasted rainfall intensity.",
        icon: CloudLightning,
    },
    {
        title: "3D Digital Twin",
        description: "High-fidelity extrusion models of Delhi's wards visualizing elevation-based flood risks in real-time.",
        icon: Layers,
    },
    {
        title: "Citizen Reporting",
        description: "AI-verified incident reporting system allowing citizens to validate model predictions with on-ground data.",
        icon: Users,
    },
];

export function Features() {
    return (
        <section className="py-24">
            <div className="container mx-auto px-4">
                <div className="grid gap-8 md:grid-cols-3">
                    {features.map((feature) => (
                        <div
                            key={feature.title}
                            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-surface p-8 transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
                        >
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-background text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-white">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.description}</p>

                            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary to-water opacity-0 group-hover:opacity-10 blur-2xl transition-opacity" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
