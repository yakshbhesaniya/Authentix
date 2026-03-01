"use client";
import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import {
    Shield, Brain, Zap, ArrowLeft, Download,
    CheckCircle2, XCircle, Loader2, Copy
} from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";

type Tab = "plagiarism" | "ai" | "humanized";

function ScoreGauge({
    score,
    color,
    label,
}: {
    score: number;
    color: string;
    label: string;
}) {
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-40 h-40">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <circle
                        cx="80" cy="80" r="70" fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black">{Math.round(score)}</span>
                    <span className="text-xs text-[var(--text-secondary)]">/100</span>
                </div>
            </div>
            <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        </div>
    );
}

function SignalRow({ signal }: { signal: Record<string, unknown> }) {
    return (
        <div className="glass rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium">{signal.label as string}</span>
                {signal.ai_probability !== undefined && (
                    <span className="text-xs font-mono text-violet-400">{signal.ai_probability as number}%</span>
                )}
                {signal.value !== undefined && (
                    <span className="text-xs font-mono text-violet-400">{signal.value as number}</span>
                )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{signal.description as string}</p>
        </div>
    );
}

export default function ResultsPage({ params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = use(params);
    const [job, setJob] = useState<Record<string, unknown> | null>(null);
    const [results, setResults] = useState<Record<string, unknown> | null>(null);
    const [tab, setTab] = useState<Tab>("plagiarism");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const poll = async () => {
            try {
                const data = await api.getJob(jobId);
                setJob(data.job);
                if (data.results) setResults(data.results);
                if (data.job.status === "completed" || data.job.status === "failed") {
                    setLoading(false);
                }
            } catch (_) {
                setLoading(false);
            }
        };
        poll();
        const interval = setInterval(() => {
            if (loading) poll();
        }, 2000);
        return () => clearInterval(interval);
    }, [jobId, loading]);

    const copyHumanized = () => {
        if (results?.humanized_text) {
            navigator.clipboard.writeText(results.humanized_text as string);
            toast.success("Copied to clipboard!");
        }
    };

    const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
        { id: "plagiarism", label: "Plagiarism", icon: Shield },
        { id: "ai", label: "AI Detection", icon: Brain },
        { id: "humanized", label: "Humanized", icon: Zap },
    ];

    const plagiarismScore = (results?.plagiarism_score as number) ?? 0;
    const aiScore = (results?.ai_score as number) ?? 0;
    const aiSignals = results?.ai_signals as Record<string, Record<string, unknown>> | null;
    const validationData = results?.humanize_validation as Record<string, unknown> | null;

    return (
        <div className="min-h-screen">
            {/* Nav */}
            <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-all">
                        <ArrowLeft size={16} />
                        <span className="text-sm">Dashboard</span>
                    </Link>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                            <Shield size={12} className="text-white" />
                        </div>
                        <span className="font-bold text-sm">Authentix</span>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
                {/* Status banner */}
                {job && (
                    <div className="mb-6 flex items-center gap-3">
                        {job.status === "processing" || job.status === "queued" ? (
                            <><Loader2 size={18} className="text-blue-400 animate-spin" />
                                <span className="text-sm text-[var(--text-secondary)]">
                                    Analyzing... {job.progress as number || 0}%
                                </span>
                                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden max-w-xs">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-600 to-purple-700 transition-all duration-700"
                                        style={{ width: `${job.progress || 0}%` }}
                                    />
                                </div></>
                        ) : job.status === "failed" ? (
                            <><XCircle size={18} className="text-red-400" />
                                <span className="text-sm text-red-400">Analysis failed: {job.error as string}</span></>
                        ) : (
                            <><CheckCircle2 size={18} className="text-emerald-400" />
                                <span className="text-sm text-emerald-400">Analysis complete</span></>
                        )}
                    </div>
                )}

                {!results && (loading || job?.status === "queued" || job?.status === "processing") ? (
                    <div className="glass rounded-3xl p-20 text-center">
                        <Loader2 size={48} className="text-violet-400 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Running Analysis Pipeline</h2>
                        <p className="text-[var(--text-secondary)] text-sm">This may take a moment for large documents...</p>
                    </div>
                ) : results ? (
                    <>
                        {/* Score cards overview */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid md:grid-cols-2 gap-6 mb-8"
                        >
                            <div className="glass rounded-3xl p-8 flex flex-col items-center">
                                <ScoreGauge
                                    score={plagiarismScore}
                                    color={plagiarismScore > 50 ? "#ef4444" : plagiarismScore > 20 ? "#f59e0b" : "#10d9a3"}
                                    label="Plagiarism Score"
                                />
                                <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
                                    {plagiarismScore > 50
                                        ? "High similarity detected — review highlighted segments"
                                        : plagiarismScore > 20
                                            ? "Moderate similarity — some overlapping content"
                                            : "Low similarity — content appears largely original"}
                                </p>
                            </div>

                            <div className="glass rounded-3xl p-8 flex flex-col items-center">
                                <ScoreGauge
                                    score={aiScore}
                                    color={aiScore > 65 ? "#ef4444" : aiScore > 35 ? "#f59e0b" : "#10d9a3"}
                                    label="AI Generation Score"
                                />
                                <p className="text-xs text-[var(--text-secondary)] text-center mt-3">
                                    {aiScore > 65
                                        ? "Likely AI-generated — high pattern match"
                                        : aiScore > 35
                                            ? "Uncertain — mixed signals detected"
                                            : "Likely human-written — low AI indicators"}
                                </p>
                                {results?.ai_confidence_low != null && (
                                    <div className="mt-2 text-xs text-[var(--text-secondary)]">
                                        CI: [{Math.round(results.ai_confidence_low as number)}, {Math.round(results.ai_confidence_high as number)}]
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Tab navigation */}
                        <div className="flex gap-2 mb-6">
                            {tabs.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTab(t.id)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id
                                        ? "bg-gradient-to-r from-violet-600 to-purple-700 text-white"
                                        : "glass text-[var(--text-secondary)] hover:text-white"
                                        }`}
                                >
                                    <t.icon size={14} />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {tab === "plagiarism" && (
                                <div className="glass rounded-3xl p-6">
                                    <h3 className="text-lg font-bold mb-1">Plagiarism Report</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mb-6">Hybrid lexical + semantic + structural analysis</p>
                                    {results.plagiarism_report ? (
                                        <div className="space-y-4">
                                            {["lexical_score", "semantic_score", "structural_score"].map((key) => {
                                                const report = results.plagiarism_report as Record<string, number>;
                                                const val = report[key] ?? 0;
                                                return (
                                                    <div key={key}>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span className="capitalize text-[var(--text-secondary)]">{key.replace("_", " ")}</span>
                                                            <span className="font-mono">{val.toFixed(1)}%</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-red-500"
                                                                style={{ width: `${val}%`, transition: "width 1s ease" }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Matched segments */}
                                            {(results.plagiarism_report as Record<string, unknown[]>).matched_segments?.length > 0 && (
                                                <div className="mt-6">
                                                    <h4 className="text-sm font-semibold mb-3">Matched Segments</h4>
                                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                                        {((results.plagiarism_report as Record<string, Record<string, unknown>[]>).matched_segments || []).map((seg, i) => (
                                                            <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs">
                                                                <p className="text-red-300 font-medium mb-1">Original: <span className="text-white">{seg.original as string}</span></p>
                                                                <p className="text-[var(--text-secondary)]">Matched: {seg.matched as string}</p>
                                                                <p className="text-red-400 mt-1">Similarity: {((seg.similarity as number) * 100).toFixed(1)}%</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[var(--text-secondary)] text-sm">No plagiarism check was run (humanize-only job).</p>
                                    )}
                                </div>
                            )}

                            {tab === "ai" && (
                                <div className="glass rounded-3xl p-6">
                                    <h3 className="text-lg font-bold mb-1">AI Detection Breakdown</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mb-6">4-model ensemble with per-signal explanation</p>
                                    {aiSignals ? (
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {Object.values(aiSignals).map((signal, i) => (
                                                <SignalRow key={i} signal={signal} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[var(--text-secondary)] text-sm">No AI detection was run.</p>
                                    )}
                                </div>
                            )}

                            {tab === "humanized" && (
                                <div className="glass rounded-3xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-bold">Humanized Output</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">Rewritten with semantic validation ≥ 0.92</p>
                                        </div>
                                        {Boolean(results.humanized_text) && (
                                            <button
                                                onClick={copyHumanized}
                                                className="flex items-center gap-2 glass px-4 py-2 rounded-xl text-sm hover:border-violet-500/40 transition-all"
                                            >
                                                <Copy size={14} />
                                                Copy
                                            </button>
                                        )}
                                    </div>

                                    {results.humanized_text ? (
                                        <>
                                            <div className="bg-white/3 rounded-2xl p-5 text-sm leading-relaxed max-h-64 overflow-y-auto mb-6">
                                                {results.humanized_text as string}
                                            </div>
                                            {validationData && (
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-3">Validation Report</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {[
                                                            { label: "Semantic Sim.", value: `${((validationData.semantic_similarity as number) * 100).toFixed(1)}%`, pass: (validationData.semantic_similarity as number) >= 0.92 },
                                                            { label: "NER Preserved", value: (validationData.ner_preservation as Record<string, boolean>)?.preserved ? "✓" : "✗", pass: (validationData.ner_preservation as Record<string, boolean>)?.preserved },
                                                            { label: "Numbers OK", value: (validationData.numeric_fidelity as Record<string, boolean>)?.preserved ? "✓" : "✗", pass: (validationData.numeric_fidelity as Record<string, boolean>)?.preserved },
                                                            { label: "Structure OK", value: (validationData.structure_preservation as Record<string, boolean>)?.preserved ? "✓" : "✗", pass: (validationData.structure_preservation as Record<string, boolean>)?.preserved },
                                                        ].map((item) => (
                                                            <div key={item.label} className={`rounded-xl p-3 text-center ${item.pass ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                                                                <div className={`text-lg font-bold ${item.pass ? "text-emerald-400" : "text-red-400"}`}>{item.value}</div>
                                                                <div className="text-xs text-[var(--text-secondary)] mt-1">{item.label}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {validationData.final_ai_score != null && validationData.final_ai_score !== -1 && (
                                                        <p className="text-xs text-[var(--text-secondary)] mt-3">
                                                            Post-humanization AI score: <span className="text-violet-400 font-mono">{Math.round(validationData.final_ai_score as number)}/100</span>
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[var(--text-secondary)] text-sm">No humanization was run for this job type.</p>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </>
                ) : (
                    <div className="glass rounded-3xl p-20 text-center">
                        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
                        <p className="text-[var(--text-secondary)] text-sm">{job?.error as string || "An unknown error occurred."}</p>
                        <Link href="/dashboard" className="inline-block mt-6 text-violet-400 text-sm hover:underline">
                            ← Back to Dashboard
                        </Link>
                    </div>
                )}

                {/* Footer credit */}
                <p className="text-center text-xs text-[var(--text-secondary)] mt-12">
                    Made with <span className="text-red-400">♥</span> by{" "}
                    <span className="text-violet-400 font-medium">Yaksh Bhesaniya</span>
                </p>
            </div>
        </div>
    );
}
