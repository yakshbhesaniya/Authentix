"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { Suspense } from "react";

function AuthForm() {
    const router = useRouter();
    const params = useSearchParams();
    const [mode, setMode] = useState<"login" | "signup">(
        (params.get("mode") as "login" | "signup") || "login"
    );
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "" });

    const isSignup = mode === "signup";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = isSignup
                ? await api.register({ name: form.name, email: form.email, password: form.password })
                : await api.login({ email: form.email, password: form.password });
            localStorage.setItem("authentix_token", result.token);
            localStorage.setItem("authentix_user", JSON.stringify(result.user));
            toast.success(`Welcome${result.user.name ? `, ${result.user.name}` : ""}!`);
            router.push("/dashboard");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                            <Shield size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-xl">Authentix</span>
                    </Link>
                    <h1 className="text-3xl font-black">
                        {isSignup ? "Create Account" : "Welcome Back"}
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm mt-2">
                        {isSignup ? "Start detecting, analyzing, and humanizing" : "Sign in to your workspace"}
                    </p>
                </div>

                {/* Card */}
                <div className="glass rounded-3xl p-8">
                    {/* Toggle */}
                    <div className="flex glass rounded-xl p-1 mb-6">
                        {(["login", "signup"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === m
                                        ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white"
                                        : "text-[var(--text-secondary)] hover:text-white"
                                    }`}
                            >
                                {m === "login" ? "Sign In" : "Sign Up"}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignup && (
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required={isSignup}
                                    className="w-full glass rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-violet-500/60 text-white"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                className="w-full glass rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-violet-500/60 text-white"
                            />
                        </div>

                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                            <input
                                type={showPwd ? "text" : "password"}
                                placeholder="Password (min 8 chars)"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                minLength={8}
                                className="w-full glass rounded-xl pl-11 pr-12 py-3.5 text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-violet-500/60 text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white"
                            >
                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all glow mt-2"
                        >
                            {loading ? "Processing..." : isSignup ? "Create Account" : "Sign In"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-[var(--text-secondary)] mt-6">
                    Made with <span className="text-red-400">♥</span> by{" "}
                    <span className="text-violet-400 font-medium">Yaksh Bhesaniya</span>
                </p>
            </motion.div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense>
            <AuthForm />
        </Suspense>
    );
}
