import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        {/* Typographic monogram — no pictorial icon */}
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-background text-sm font-bold tracking-tight">
                            JD
                        </span>
                        <span className="text-lg font-semibold tracking-tight text-text-strong">
                            JalDrishti
                        </span>
                    </Link>

                    <nav className="flex items-center gap-3">
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

            <footer className="border-t border-border bg-background py-10">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-text-muted text-sm">
                    <p>© 2025 JalDrishti. Hack4Delhi Prototype.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-primary transition-colors duration-200">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors duration-200">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors duration-200">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
