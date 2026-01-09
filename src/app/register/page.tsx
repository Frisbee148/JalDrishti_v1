"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("http://localhost:8000/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Registration failed");
            }

            // Auto-login or redirect to login? Let's redirect to login for clarity
            router.push("/login?registered=true");
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_100%,_rgba(56,189,248,0.1),_transparent_70%)] pointer-events-none" />

            <div className="w-full max-w-md p-8 bg-surface border border-white/10 rounded-2xl relative z-10 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">Create Account</h1>
                    <p className="text-slate-400">Join the JalDrishti community.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="Choose a username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                            placeholder="you@example.com"
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
                        Sign Up
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
