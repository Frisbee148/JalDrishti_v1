"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const res = await fetch("http://localhost:8000/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Login failed");
            }

            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            router.push("/community"); // Redirect to community or dashboard
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(56,189,248,0.15),_transparent_70%)] pointer-events-none" />

            <div className="w-full max-w-md p-8 bg-surface border border-white/10 rounded-2xl relative z-10 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">JalDrishti</h1>
                    <p className="text-slate-400">Sign in to access community reports.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="Enter username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <Button type="submit" className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500">
                        Sign In
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
}
