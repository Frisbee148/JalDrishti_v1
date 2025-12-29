import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Droplets } from "lucide-react";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                            <Droplets className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">JalDrishti</span>
                    </Link>

                    <nav className="flex items-center gap-4">
                        <Link href="/dashboard" className="hidden sm:block">
                            <Button variant="ghost" size="sm">Live Map</Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button size="sm">Launch App</Button>
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-white/5 bg-background py-8">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
                    <p>© 2025 JalDrishti. Hack4Delhi Prototype.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
