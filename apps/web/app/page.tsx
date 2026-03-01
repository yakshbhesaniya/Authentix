"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Zap, Brain, FileSearch, ChevronRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Plagiarism Detection",
    desc: "Semantic + lexical hybrid detection. Catches paraphrased plagiarism other tools miss.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Brain,
    title: "AI Content Detection",
    desc: "Ensemble model: RoBERTa + perplexity + stylometrics + distribution analysis. Score 0–100.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Zap,
    title: "Humanization Engine",
    desc: "Transform AI text into naturally human writing. Passes semantic validation ≥ 0.92.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Shield,
    title: "Validation Firewall",
    desc: "Entity lock, numeric fidelity, and structure preservation — no information loss.",
    color: "from-orange-500 to-amber-600",
  },
];

const stats = [
  { value: "0–100", label: "AI Score Precision" },
  { value: "≥ 0.92", label: "Semantic Similarity" },
  { value: "4-Model", label: "Detection Ensemble" },
  { value: "100k+", label: "Words Supported" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Authentix</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth?mode=login" className="text-sm text-[var(--text-secondary)] hover:text-white transition-all px-4 py-2">
              Sign In
            </Link>
            <Link href="/auth?mode=signup" className="text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-700 text-white px-5 py-2 rounded-xl hover:opacity-90 transition-all pulse-glow">
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 glass text-xs text-violet-300 px-4 py-2 rounded-full mb-8 border border-violet-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Production-Grade Content Intelligence
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-none">
              Know If It's{" "}
              <span className="gradient-text">Real</span>
              <br />or Not
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
              Detect plagiarism with semantic precision. Score AI-generated content with ensemble models.
              Humanize text with a validation-gated rewriting pipeline.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold text-base hover:opacity-90 transition-all glow">
                Start Analyzing Free <ChevronRight size={18} />
              </Link>
              <Link href="#features" className="inline-flex items-center gap-2 glass text-white px-8 py-4 rounded-2xl font-semibold text-base hover:border-violet-500/40 transition-all">
                See How It Works
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="glass rounded-2xl p-5 text-center">
                <div className="text-2xl font-black gradient-text">{s.value}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Everything You Need</h2>
            <p className="text-[var(--text-secondary)]">Three engines. One platform. Zero compromises.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="glass rounded-2xl p-7 hover:border-violet-500/30 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-all`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">How It Works</h2>
          </div>
          <div className="space-y-4">
            {[
              { step: "01", title: "Upload or Paste", desc: "Drop a PDF, DOCX, or paste text directly. Supports documents up to 100k+ words." },
              { step: "02", title: "Pipeline Runs", desc: "Ingestion → Plagiarism → AI Detection → Humanization, all async with real-time progress." },
              { step: "03", title: "Review Results", desc: "Get a detailed report: plagiarism %, AI score with breakdown, and humanized output with validation." },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="glass rounded-2xl p-6 flex gap-6 items-start"
              >
                <div className="text-4xl font-black gradient-text opacity-60 shrink-0 w-14">{item.step}</div>
                <div>
                  <h3 className="font-bold text-lg">{item.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass-bright rounded-3xl p-12 text-center glow"
        >
          <h2 className="text-4xl font-black mb-4">Ready to Analyze?</h2>
          <p className="text-[var(--text-secondary)] mb-8">
            Join and get measurable, transparent content intelligence backed by data.
          </p>
          <Link href="/auth?mode=signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white px-10 py-4 rounded-2xl font-semibold hover:opacity-90 transition-all">
            Get Started Free <ChevronRight size={18} />
          </Link>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            {["No credit card required", "Async processing", "Export reports", "REST API access"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle size={12} />
                {t}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Shield size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm">Authentix</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            Made with <span className="text-red-400">♥</span> by{" "}
            <span className="text-violet-400 font-medium">Yaksh Bhesaniya</span>
          </p>
          <p className="text-[var(--text-secondary)] text-xs">© 2026 Authentix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
