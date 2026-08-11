import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, AlertCircle } from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────────────────────
export function cls(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(" ");
}

// ─── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "neutral" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, children, className, disabled, ...rest }: ButtonProps) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "btn-primary",
    ghost:   "btn-ghost",
    danger:  "btn-danger",
    neutral: "btn-neutral",
    gold:    "bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-black font-bold rounded-lg border-none cursor-pointer transition-all hover:-translate-y-px",
  };
  return (
    <button className={cls(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cls("nl-input", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <select className={cls("nl-select", className)} {...rest}>{children}</select>;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cls("nl-input", "resize-none", className)} {...rest} />;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cls("flex flex-col gap-1.5", className)}>
      {label ? <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">{label}</label> : null}
      {children}
      {hint ? <p className="text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ title, action, children, accent, className, style }: { title?: string; action?: ReactNode; children: ReactNode; accent?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cls(accent ? "nl-card-accent" : "nl-card", className)} style={style}>
      {(title || action) ? (
        <div className="flex items-center justify-between mb-4">
          {title ? <h3 className="font-semibold text-sm text-[var(--text-primary)]">{title}</h3> : <span />}
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KPICard({ label, value, sub, trend, trendUp, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string; trend?: string; trendUp?: boolean; icon?: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={cls("nl-card group hover:border-[var(--accent-border)] transition-all", accent && "nl-card-accent")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">{label}</p>
          <p className="text-2xl font-bold gradient-text-accent figures">{value}</p>
          {sub ? <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p> : null}
          {trend ? (
            <p className={cls("text-xs font-semibold mt-1", trendUp ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {trendUp ? "▲" : "▼"} {trend}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <div className="p-2 rounded-lg" style={{ background: "var(--accent-glow)" }}>
            <Icon size={20} style={{ color: "var(--accent-primary)" }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ headers, children, passbook }: { headers: string[]; children: ReactNode; passbook?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={cls("nl-table", passbook && "passbook")}>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className, mono, right }: { children?: ReactNode; className?: string; mono?: boolean; right?: boolean }) {
  return <td className={cls(mono && "figures font-mono text-sm", right && "text-right", className)}>{children}</td>;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeTone = "success" | "warning" | "danger" | "info" | "accent" | "neutral" | "gold" | "good" | "bad" | "warn" | "brass";
const TONE_MAP: Record<string, string> = {
  success: "badge-success", good: "badge-success",
  warning: "badge-warning", warn: "badge-warning",
  danger: "badge-danger",  bad: "badge-danger",
  info: "badge-info",
  accent: "badge-accent",  brass: "badge-gold",
  neutral: "badge-neutral",
  gold: "badge-gold",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={cls("badge", TONE_MAP[tone] ?? "badge-neutral")}>{children}</span>;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cls("glass-accent rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up", wide ? "w-full max-w-3xl" : "w-full max-w-lg")}>
        {title ? (
          <div className="flex items-center justify-between p-5 border-b border-[var(--bg-border)]">
            <h2 className="font-bold text-base text-white">{title}</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-xl leading-none px-2">×</button>
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={cls(
            "px-4 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-all",
            t === active
              ? "text-white shadow-sm"
              : "text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
          )}
          style={t === active ? { background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))" } : {}}
        >{t}</button>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function Empty({ title, hint, icon: Icon }: { title: string; hint?: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon ? <Icon size={40} className="mb-4 opacity-30" style={{ color: "var(--accent-primary)" }} /> : (
        <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center" style={{ background: "var(--accent-glow)" }}>
          <span className="text-2xl">📭</span>
        </div>
      )}
      <p className="font-semibold text-[var(--text-primary)] mb-1">{title}</p>
      {hint ? <p className="text-sm text-[var(--text-muted)] max-w-sm">{hint}</p> : null}
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────
export function Loading({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16">
      <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
      <span className="text-sm text-[var(--text-secondary)]">{text ?? "Loading…"}</span>
    </div>
  );
}

// ─── Error Text ───────────────────────────────────────────────────────────────
export function ErrorText({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
      <AlertCircle size={14} />
      {error}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {sub ? <p className="text-sm text-[var(--text-secondary)] mt-0.5">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

// ─── Stat Card Row ────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="nl-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-bold gradient-text-accent figures">{value}</p>
      {sub ? <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p> : null}
    </div>
  );
}
