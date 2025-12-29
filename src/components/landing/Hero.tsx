import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Map, ShieldAlert, Activity } from "lucide-react";

export function Hero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
            <div className="container mx-auto px-4 text-center">
                <div className="mx-auto max-w-4xl">
                    <div className="inline-flex items-center rounded-full border border-violet-500/30 bg-surface/50 px-3 py-1 text-sm text-violet-300 backdrop-blur-md mb-8">
                        <span className="flex h-2 w-2 rounded-full bg-water mr-2 animate-pulse"></span>
                        Hack4Delhi 2025 Prototype
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight text-white lg:text-7xl mb-6">
                        Predictive Resilience for a <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-water to-primary">
                            Water-Secure Delhi
                        </span>
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 mb-10 leading-relaxed">
                        JalDrishti combines AI-driven predictive modeling with a 3D digital twin of Delhi's drainage infrastructure to forecast waterlogging risks before the rain falls.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/dashboard">
                            <Button size="lg" className="w-full sm:w-auto gap-2 group">
                                <Map className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                Explore Live Map
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2">
                                <Activity className="w-5 h-5 text-water" />
                                View Real-time Index
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Abstract Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-30"></div>
        </section>
    );
}
