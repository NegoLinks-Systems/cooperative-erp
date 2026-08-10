import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/core";
import { Loader2, Users, TrendingUp, Shield, Sparkles } from "lucide-react";

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
          email, password,
          options: { data: { full_name: name } },
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
      {/* Left Hero Panel — Community / cooperative theme */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12">
        {/* Background glow */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(22,163,74,0.2) 0%, transparent 70%), radial-gradient(ellipse at 80% 20%, rgba(22,163,74,0.1) 0%, transparent 60%)" }} />

        {/* Animated circles — interconnected community */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[160, 240, 320, 400].map((size, i) => (
            <div key={size} className="absolute rounded-full border border-[var(--accent-primary)] opacity-10"
              style={{ width: size, height: size, animationDelay: `${i * 0.5}s`,
                animation: `grow-circle ${3 + i}s ease-in-out infinite` }} />
          ))}
          {/* Center node */}
          <div className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center animate-float"
            style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))", boxShadow: "0 0 60px var(--accent-glow)" }}>
            <Users size={36} className="text-white" />
          </div>
          {/* Orbiting nodes */}
          {[
            { icon: TrendingUp, label: "Savings & Loans", angle: 0,   dist: 140 },
            { icon: Shield,     label: "Governance",      angle: 120,  dist: 140 },
            { icon: Sparkles,   label: "AI Insights",     angle: 240,  dist: 140 },
          ].map(({ icon: Icon, label, angle, dist }) => {
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * dist;
            const y = Math.sin(rad) * dist;
            return (
              <div key={label} className="absolute flex flex-col items-center gap-2"
                style={{ transform: `translate(${x}px, ${y}px)` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--accent-border)" }}>
                  <Icon size={20} style={{ color: "var(--accent-light)" }} />
                </div>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Text content */}
        <div className="relative z-10 mt-64 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Built for Cooperatives</h2>
          <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed">
            Complete enterprise management for cooperative societies — members, savings, loans, governance, and AI-powered insights in one platform.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6">
            {[["17", "User Roles"], ["46", "DB Tables"], ["100%", "AI-Powered"]].map(([num, lbl]) => (
              <div key={lbl} className="text-center">
                <p className="text-xl font-bold gradient-text-accent">{num}</p>
                <p className="text-xs text-[var(--text-muted)]">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="w-full lg:w-[440px] flex items-center justify-center p-6">
        <div className="w-full max-w-sm glass-accent rounded-2xl p-8 shadow-2xl">
          {/* NegoLinks brand */}
          <div className="flex flex-col items-center mb-8">
            <img src="/assets/negolinks-logo.svg" alt="NegoLinks" className="w-14 h-14 mb-3" />
            <h1 className="text-2xl font-black gradient-text-gold tracking-tight">NegoLinks</h1>
            <p className="text-sm text-white font-semibold mt-1">Cooperative & Microfinance ERP</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Enterprise AI-Powered Business Management</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Full Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="nl-input" />
              </div>
            ) : null}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Email Address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="nl-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">Password</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="nl-input" />
            </div>

            {error ? (
              <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                {error}
              </div>
            ) : null}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-sm justify-center flex items-center gap-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === "login" ? "Sign In to Enterprise Platform" : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-light)] transition-colors">
              {mode === "login" ? "New user? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>

          {mode === "signup" ? (
            <p className="mt-3 text-xs text-center text-[var(--text-muted)]">
              First account created becomes Super Admin
            </p>
          ) : null}

          <div className="mt-6 pt-4 border-t border-[var(--bg-border)] flex items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
            <Shield size={11} />
            Secure Enterprise Login · TLS Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
