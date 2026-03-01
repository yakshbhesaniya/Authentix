"use client";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
    Upload, FileText, Brain, Zap, Shield, LogOut,
    ChevronRight, Clock, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";

type AnalysisMode = "analyze" | "humanize" | "full_report";

const modes = [
    { id: "analyze", label: "Analyze", icon: Brain, desc: "Plagiarism + AI detection" },
    { id: "full_report", label: "Full Report", icon: Shield, desc: "All engines + humanize" },
    { id: "humanize", label: "Humanize", icon: Zap, desc: "Rewrite to sound human" },
] as const;

const STATUS_ICONS = {
    queued: Clock,
    processing: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
};
const STATUS_COLORS = {
    queued: "text-yellow-400",
    processing: "text-blue-400",
    completed: "text-emerald-400",
    failed: "text-red-400",
};

export default function Dashboard() {
    const router = useRouter();
    const [mode, setMode] = useState<AnalysisMode>("full_report");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [jobs, setJobs] = useState<unknown[]>([]);
    const [activeTab, setActiveTab] = useState<"text" | "file">("text");

    const user = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("authentix_user") || "{}")
        : {};

    useEffect(() => {
        if (!localStorage.getItem("authentix_token")) {
            router.push("/auth?mode=login");
            return;
        }
        loadJobs();
        const interval = setInterval(loadJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadJobs = async () => {
        try {
            const res = await api.listJobs();
            setJobs(res.jobs || []);
        } catch (_) { }
    };

    const handleTextSubmit = async () => {
        if (!text.trim()) return toast.error("Please enter some text");
        setLoading(true);
        try {
            let res;
            if (mode === "analyze") res = await api.analyze(text);
            else if (mode === "humanize") res = await api.humanize(text);
            else res = await api.fullReport(text);
            toast.success("Analysis queued!");
            router.push(`/results/${res.jobId}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error");
        } finally {
            setLoading(false);
        }
    };

    const onDrop = useCallback(async (files: File[]) => {
        const file = files[0];
        if (!file) return;
        setLoading(true);
        try {
            const res = await api.upload(file);
            if (res.error) throw new Error(res.error);
            toast.success("File uploaded! Analysis starting...");
            router.push(`/results/${res.jobId}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/pdf": [".pdf"],
            "application/msword": [".doc"],
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
            "text/plain": [".txt"],
        },
        maxFiles: 1,
    });

    const handleLogout = () => {
        localStorage.clear();
        router.push("/");
    };

    return (
        <div className="min-h-screen">
            {/* ── Nav ── */}
            <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                            <Shield size={14} className="text-white" />
                        </div>
                        <span className="font-bold text-base">Authentix</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-secondary)] hidden md:block">{user.email}</span>
                        <button onClick={handleLogout} className="text-[var(--text-secondary)] hover:text-white transition-all p-2">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* ── Main Input ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h1 className="text-3xl font-black mb-1">Analyze Content</h1>
                            <p className="text-[var(--text-secondary)] text-sm">Paste text or upload a file to begin</p>
                        </div>

                        {/* Mode selector */}
                        <div className="grid grid-cols-3 gap-3">
                            {modes.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id as AnalysisMode)}
                                    className={`glass rounded-2xl p-4 text-left transition-all ${mode === m.id ? "border-violet-500/50 bg-violet-500/10" : "hover:border-white/15"}`}
                                >
                                    <m.icon size={20} className={mode === m.id ? "text-violet-400" : "text-[var(--text-secondary)]"} />
                                    <div className="mt-2 text-sm font-semibold">{m.label}</div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">{m.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Input tabs */}
                        <div className="glass rounded-2xl overflow-hidden">
                            <div className="flex border-b border-white/5">
                                {(["text", "file"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${activeTab === t ? "text-violet-400 border-b-2 border-violet-500" : "text-[var(--text-secondary)] hover:text-white"
                                            }`}
                                    >
                                        {t === "text" ? <FileText size={14} /> : <Upload size={14} />}
                                        {t === "text" ? "Paste Text" : "Upload File"}
                                    </button>
                                ))}
                            </div>

                            <div className="p-5">
                                {activeTab === "text" ? (
                                    <>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            placeholder="Paste your text here... (minimum 50 characters)"
                                            rows={12}
                                            className="w-full bg-transparent resize-none text-sm text-white placeholder:text-[var(--text-secondary)] focus:outline-none leading-relaxed"
                                        />
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                            <span className="text-xs text-[var(--text-secondary)]">
                                                {text.split(/\s+/).filter(Boolean).length} words
                                            </span>
                                            <button
                                                onClick={handleTextSubmit}
                                                disabled={loading || text.length < 10}
                                                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
                                            >
                                                {loading ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <>Analyze <ChevronRight size={14} /></>}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${isDragActive ? "border-violet-500 bg-violet-500/10" : "border-white/10 hover:border-violet-500/40"
                                            }`}
                                    >
                                        <input {...getInputProps()} />
                                        <Upload size={40} className="mx-auto mb-4 text-[var(--text-secondary)]" />
                                        <p className="font-semibold">{isDragActive ? "Drop file here" : "Drag & drop or click to browse"}</p>
                                        <p className="text-xs text-[var(--text-secondary)] mt-2">PDF, DOC, DOCX, TXT · Max 50MB</p>
                                        {loading && <p className="text-violet-400 text-sm mt-4">Uploading...</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Job History ── */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold">Recent Jobs</h2>
                        {jobs.length === 0 ? (
                            <div className="glass rounded-2xl p-8 text-center text-[var(--text-secondary)] text-sm">
                                No jobs yet. Start your first analysis!
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(jobs as Record<string, unknown>[]).map((job) => {
                                    const status = job.status as keyof typeof STATUS_ICONS;
                                    const Icon = STATUS_ICONS[status] || Clock;
                                    const colorClass = STATUS_COLORS[status] || "text-gray-400";
                                    return (
                                        <Link key={job.id as string} href={`/results/${job.id}`}>
                                            <div className="glass rounded-xl p-4 hover:border-violet-500/30 transition-all cursor-pointer">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} className={`${colorClass} ${status === "processing" ? "animate-spin" : ""}`} />
                                                        <span className="text-xs font-medium capitalize">{status}</span>
                                                    </div>
                                                    <span className="text-xs text-[var(--text-secondary)] capitalize">{(job.type as string).replace("_", " ")}</span>
                                                </div>
                                                {Boolean(job.file_name) && (
                                                    <p className="text-xs text-[var(--text-secondary)] mt-2 truncate">{String(job.file_name)}</p>
                                                )}
                                                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-violet-600 to-purple-700 transition-all duration-500"
                                                        style={{ width: `${job.progress || 0}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1">{job.progress as number || 0}%</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer credit */}
                        <p className="text-center text-xs text-[var(--text-secondary)] pt-8">
                            Made with <span className="text-red-400">♥</span> by{" "}
                            <span className="text-violet-400 font-medium">Yaksh Bhesaniya</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
