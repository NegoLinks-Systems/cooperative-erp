import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/core";
import { Loader2, Users, TrendingUp, Shield, Sparkles, Landmark } from "lucide-react";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [mode,     setMode]     = useState<"login" | "signup">("login");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-primary)" }}>

      {/* ══ LEFT HERO PANEL ══ */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center px-12">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(22,163,74,0.18) 0%, transparent 70%)" }} />

        {/* Content column — graphic on top, text below, no overlap */}
        <div className="relative z-10 flex flex-col items-center max-w-md w-full">

          {/* Graphic block — self-contained fixed box */}
          <div className="relative w-[340px] h-[340px] flex items-center justify-center shrink-0">
            {/* Expanding rings */}
            {[0, 1, 2].map((i) => (
              <div key={i}
                className="absolute rounded-full border pointer-events-none"
                style={{
                  width: 200 + i * 60, height: 200 + i * 60,
                  borderColor: "var(--accent-primary)", opacity: 0.12,
                  animation: `grow-circle ${4 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.8}s`,
                }} />
            ))}

            {/* Static orbit ring */}
            <div className="absolute rounded-full border pointer-events-none"
              style={{ width: 240, height: 240, borderColor: "var(--accent-border)", opacity: 0.4 }} />

            {/* Center hub */}
            <div className="relative z-20 w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))",
                boxShadow: "0 0 50px rgba(22,163,74,0.4)",
              }}>
              <Users size={32} className="text-white" strokeWidth={1.8} />
            </div>

            {/* Orbiting nodes — positioned inside this 340px box only */}
            {[
              { icon: TrendingUp, label: "Savings & Loans", top: "8%",  left: "50%" },
              { icon: Shield,     label: "Governance",      top: "72%", left: "12%" },
              { icon: Sparkles,   label: "AI Insights",     top: "72%", left: "88%" },
            ].map(({ icon: Icon, label, top, left }) => (
              <div key={label}
                className="absolute z-20 flex flex-col items-center gap-1.5"
                style={{ top, left, transform: "translate(-50%, -50%)" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--accent-border)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}>
                  <Icon size={19} style={{ color: "var(--accent-light)" }} strokeWidth={1.8} />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-muted)] whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>

          {/* Text block — clean separation, no overlap */}
          <div className="text-center mt-6">
            <h2 className="text-[26px] font-bold text-white leading-tight mb-3">
              Built for Cooperatives
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
              Complete enterprise management for cooperative societies — members, savings,
              loans, governance, and AI-powered insights in one platform.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-10 mt-8 pt-6"
              style={{ borderTop: "1px solid var(--bg-border)" }}>
              {[["17", "User Roles"], ["46", "DB Tables"], ["100%", "AI-Powered"]].map(([num, lbl]) => (
                <div key={lbl} className="text-center">
                  <p className="text-[22px] font-bold gradient-text-accent leading-none mb-1.5">{num}</p>
                  <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">{lbl}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT LOGIN CARD ══ */}
      <div className="w-full lg:w-[460px] flex items-center justify-center p-6"
        style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--bg-border)" }}>
        <div className="w-full max-w-[360px]">

          {/* Brand block */}
          <div className="flex flex-col items-center mb-9">
            <img src="/assets/negolinks-logo.svg" alt="NegoLinks" className="w-16 h-16 mb-4" />
            <h1 className="text-[30px] font-black gradient-text-gold tracking-tight leading-none mb-2.5">
              NegoLinks
            </h1>
            <p className="text-[15px] text-white font-semibold text-center leading-snug">
              Cooperative &amp; Microfinance ERP
            </p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1.5 text-center">
              Enterprise AI-Powered Business Management
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            {mode === "signup" ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">
                  Full Name
                </label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="nl-input" style={{ padding: "12px 14px" }} />
              </div>
            ) : null}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">
                Email Address
              </label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" autoComplete="email"
                className="nl-input" style={{ padding: "12px 14px" }} />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password"
                className="nl-input" style={{ padding: "12px 14px" }} />
            </div>

            {error ? (
              <div className="px-3.5 py-3 rounded-lg text-[13px] leading-snug"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#F87171" }}>
                {error}
              </div>
            ) : null}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ padding: "13px", fontSize: "14px", marginTop: "26px" }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === "login" ? "Sign In to Enterprise Platform" : "Create Account"}
            </button>
          </form>

          {/* Mode switch */}
          <div className="mt-5 text-center">
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent-light)] transition-colors">
              {mode === "login" ? "New user? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>

          {mode === "signup" ? (
            <p className="mt-3 text-[11px] text-center text-[var(--text-muted)] leading-relaxed">
              The first account created becomes Super Admin
            </p>
          ) : null}

          {/* Security footer */}
          <div className="mt-9 pt-5 flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]"
            style={{ borderTop: "1px solid var(--bg-border)" }}>
            <Shield size={12} />
            Secure Enterprise Login · TLS Encrypted
          </div>

          {/* Powered by */}
          <p className="mt-5 text-center text-[10px] text-[var(--text-muted)] opacity-60">
            Powered by NegoLinks Enterprise Suite
          </p>
        </div>
      </div>
    </div>
  );
}
