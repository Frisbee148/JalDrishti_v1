import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
    return (
        <section className="relative overflow-hidden pt-36 pb-24 lg:pt-52 lg:pb-36">
            <div className="container mx-auto px-4">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium tracking-widest uppercase text-text-soft backdrop-blur-md mb-10">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Hack4Delhi 2025 Prototype
                    </div>

                    <h1 className="text-5xl font-semibold tracking-tight text-text-strong lg:text-7xl mb-8 leading-[1.05]">
                        Predictive resilience for a
                        <br />
                        <span className="text-gradient-hero">water-secure Delhi</span>
                    </h1>

                    <p className="mx-auto max-w-2xl text-lg text-text-soft mb-12 leading-relaxed">
                        JalDrishti pairs AI-driven predictive modeling with a 3D digital twin
                        of Delhi&rsquo;s drainage infrastructure — forecasting waterlogging
                        risk before the rain falls.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/dashboard">
                            <Button size="lg" className="w-full sm:w-auto">
                                Explore the Live Map
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                                View Real-time Index
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Restrained decorative glows */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[900px] h-[900px] glow-primary" />
            <div className="absolute -bottom-40 right-0 -z-10 w-[500px] h-[500px] glow-premium" />

            {/* Hairline rule grounding the hero */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </section>
    );
}
