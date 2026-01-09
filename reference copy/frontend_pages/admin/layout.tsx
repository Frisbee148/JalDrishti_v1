import { Sidebar } from "@/components/dashboard/Sidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 ml-64 relative min-h-screen">
                {children}
            </main>
        </div>
    );
}
