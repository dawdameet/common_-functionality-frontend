"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [teamCode, setTeamCode] = useState("");

    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === "signup") {
                // Validate Team Code first
                const cleanedCode = teamCode.trim();
                const { data: teamData, error: teamError } = await supabase
                    .from('teams')
                    .select('id')
                    .eq('code', cleanedCode)
                    .single();

                if (teamError || !teamData) {
                    throw new Error("Invalid Team Code. Please contact your administrator.");
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split("@")[0], // Default name from email
                            team_code: cleanedCode
                        },
                    },
                });
                if (error) throw error;
                setMessage("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {mode === "signin" ? "Welcome back" : "Create an account"}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {mode === "signin" ? "Sign in to access your workspace" : "Get started with your shared reality"}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="sr-only">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="relative block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="relative block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {mode === "signup" && (
                            <div>
                                <label htmlFor="teamCode" className="sr-only">Team Code</label>
                                <input
                                    id="teamCode"
                                    name="teamCode"
                                    type="text"
                                    required
                                    className="relative block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    placeholder="Team Code (e.g. AG-2026)"
                                    value={teamCode}
                                    onChange={(e) => setTeamCode(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/10 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-sm text-green-500 text-center bg-green-50 dark:bg-green-900/10 p-2 rounded">
                            {message}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-lg border border-transparent bg-zinc-900 dark:bg-zinc-100 py-2 px-4 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === "signin" ? "Sign in" : "Sign up"}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <button
                        onClick={() => {
                            setMode(mode === "signin" ? "signup" : "signin");
                            setError(null);
                            setMessage(null);
                        }}
                        className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
