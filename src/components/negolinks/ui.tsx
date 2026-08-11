import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, AlertCircle, Inbox, X } from "lucide-react";

export function cls(...a: (string | undefined | false | null)[]): string {
  return a.filter(Boolean).join(" ");
}

/* ─── Button ─────────────────────────────────────────────── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "neutral" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}
export function Button({ variant = "primary", size = "md", loading, children, className, disabled, ...rest }: ButtonProps) {
  const sizes = {
    sm: "h-7 px-2.5 text-[12px] gap-1.5",
    md: "h-8 px-3 text-[13px] gap-1.5",
    lg: "h-10 px-4 text-[13.5px] gap-2",
  };
  const variants = {
    primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger", neutral: "btn-neutral",
    gold: "border rounded-[8px] cursor-pointer font-semibold",
  };
  return (
    <button
      className={cls("inline-flex items-center justify-center whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed", sizes[size], variants[variant], className)}
      style={variant === "gold" ? { background: "var(--gold-glow)", color: "var(--gold)", borderColor: "var(--gold)" } : undefined}
      disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

/* ─── Inputs ─────────────────────────────────────────────── */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cls("nl-input", className)} {...rest} />;
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <select className={cls("nl-select", className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cls("nl-input resize-y min-h-[68px]", className)} {...rest} />;
}

export function Field({ label, hint, required, children, className }: {
  label?: string; hint?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={cls("flex flex-col gap-1.5", className)}>
      {label ? (
        <label className="t-label flex items-center gap-1">
          {label}
          {required ? <span style={{ color: "var(--danger)" }}>*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="t-micro">{hint}</p> : null}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────── */
export function Card({ title, sub, action, children, accent, className, flush }: {
  title?: string; sub?: string; action?: ReactNode; children: ReactNode;
  accent?: boolean; className?: string; flush?: boolean;
}) {
  const hasHead = Boolean(title || action);
  return (
    <section className={cls(accent ? "nl-card-accent" : "nl-card", "overflow-hidden", className)}>
      {hasHead ? (
        <header className="nl-card-head">
          <div className="min-w-0">
            {title ? <h3 className="t-h2 truncate">{title}</h3> : null}
            {sub ? <p className="t-micro mt-0.5 truncate">{sub}</p> : null}
          </div>
          {action ? <div className="flex items-center gap-2 shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className={flush ? "" : "nl-card-body"}>{children}</div>
    </section>
  );
}

/* ─── KPI Card ───────────────────────────────────────────── */
export function KPICard({ label, value, sub, trend, trendUp, icon: Icon, accent }: {
  label: string; value: string; sub?: string; trend?: string;
  trendUp?: boolean; icon?: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={cls("nl-card px-4 py-3.5 transition-colors", accent && "!border-[var(--accent-border)]")}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <p className="t-label truncate">{label}</p>
        {Icon ? <Icon size={14} strokeWidth={2} style={{ color: "var(--text-faint)" }} className="shrink-0 mt-px" /> : null}
      </div>
      <p className="t-metric truncate" title={value}>{value}</p>
      <div className="flex items-center gap-2 mt-1.5 min-h-[16px]">
        {trend ? (
          <span className="text-[11px] font-semibold figures" style={{ color: trendUp ? "var(--success)" : "var(--danger)" }}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        ) : null}
        {sub ? <span className="t-micro truncate">{sub}</span> : null}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <KPICard label={label} value={value} sub={sub} />;
}

/* ─── Table ──────────────────────────────────────────────── */
export function Table({ headers, children, dense }: { headers: string[]; children: ReactNode; dense?: boolean; passbook?: boolean }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <table className={cls("nl-table", dense && "[&_td]:py-1.5")}>
        <thead><tr>{headers.map((h, i) => <th key={`${h}-${i}`}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Td({ children, className, mono, right, muted }: {
  children?: ReactNode; className?: string; mono?: boolean; right?: boolean; muted?: boolean;
}) {
  return (
    <td className={cls(mono && "figures", right && "text-right", className)}
      style={muted ? { color: "var(--text-muted)" } : undefined}>
      {children}
    </td>
  );
}

/* ─── Badge ──────────────────────────────────────────────── */
type Tone = "success"|"warning"|"danger"|"info"|"accent"|"neutral"|"gold"|"good"|"bad"|"warn"|"brass";
const TONES: Record<string,string> = {
  success:"badge-success", good:"badge-success",
  warning:"badge-warning", warn:"badge-warning",
  danger:"badge-danger",   bad:"badge-danger",
  info:"badge-info", accent:"badge-accent",
  gold:"badge-gold", brass:"badge-gold", neutral:"badge-neutral",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cls("badge", TONES[tone] ?? "badge-neutral")}>{children}</span>;
}

/* ─── Modal ──────────────────────────────────────────────── */
export function Modal({ open, onClose, title, sub, children, footer, wide }: {
  open: boolean; onClose: () => void; title?: string; sub?: string;
  children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="nl-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nl-modal" style={{ maxWidth: wide ? 760 : 460 }}>
        {title ? (
          <header className="nl-modal-head">
            <div className="min-w-0">
              <h2 className="t-h2 truncate">{title}</h2>
              {sub ? <p className="t-micro mt-0.5">{sub}</p> : null}
            </div>
            <button onClick={onClose} aria-label="Close"
              className="shrink-0 p-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </header>
        ) : null}
        <div className="nl-modal-body">{children}</div>
        {footer ? <footer className="nl-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

/* ─── Tabs ───────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--bg-border)" }}>
      {tabs.map((t) => {
        const on = t === active;
        return (
          <button key={t} role="tab" aria-selected={on} onClick={() => onChange(t)}
            className="relative pb-2.5 whitespace-nowrap transition-colors"
            style={{
              fontSize: "var(--fs-data)",
              fontWeight: on ? 600 : 480,
              color: on ? "var(--text-primary)" : "var(--text-muted)",
            }}>
            {t}
            {on ? (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-t"
                style={{ background: "var(--accent-primary)" }} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Empty ──────────────────────────────────────────────── */
export function Empty({ title, hint, icon: Icon = Inbox, action }: {
  title: string; hint?: string; icon?: React.ElementType; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3.5"
        style={{ background: "var(--bg-raised)" }}>
        <Icon size={19} strokeWidth={1.8} style={{ color: "var(--text-faint)" }} />
      </div>
      <p className="t-h2 mb-1">{title}</p>
      {hint ? <p className="t-micro max-w-[300px] leading-relaxed">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* ─── Loading ────────────────────────────────────────────── */
export function Loading({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16">
      <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
      <span className="t-micro">{text ?? "Loading…"}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-4 flex-1" style={{ opacity: 1 - r * 0.13 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Error ──────────────────────────────────────────────── */
export function ErrorText({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
      style={{ background: "var(--danger-bg)", border: "1px solid rgba(229,72,77,0.28)" }}>
      <AlertCircle size={14} className="shrink-0 mt-px" style={{ color: "var(--danger)" }} />
      <span style={{ color: "var(--danger)", fontSize: "var(--fs-data)", lineHeight: "18px" }}>{error}</span>
    </div>
  );
}

/* ─── Page header ────────────────────────────────────────── */
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="t-display">{title}</h1>
        {sub ? <p className="t-micro mt-1">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div> : null}
    </div>
  );
}
