import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

export function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "brass" }) {
  const base = "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-primary text-white hover:opacity-90",
    ghost: "border border-line bg-panel text-ink hover:bg-primary-soft",
    danger: "bg-bad text-white hover:opacity-90",
    brass: "bg-brass text-white hover:opacity-90",
  } as const;
  return <button className={cls(base, styles[variant], className)} {...props} />;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cls("w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-primary", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cls("w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-primary", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cls("w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-2 focus:outline-primary", props.className)} />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cls("rounded-xl border border-line bg-panel", className)}>
      {title ? (
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="display text-base font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cls("rounded-xl border bg-panel p-4", accent ? "border-brass" : "border-line")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="figures mt-1 text-2xl font-semibold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-soft">{sub}</p> : null}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "warn" | "brass" | "info"; children: ReactNode }) {
  const tones = {
    neutral: "bg-primary-soft text-ink",
    good: "bg-good/10 text-good",
    bad: "bg-bad/10 text-bad",
    warn: "bg-amber-500/10 text-amber-700",
    brass: "bg-brass/10 text-brass",
    info: "bg-info/10 text-info",
  } as const;
  return <span className={cls("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cls("w-full rounded-xl border border-line bg-panel shadow-xl", wide ? "max-w-3xl" : "max-w-lg")} role="dialog" aria-modal="true">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="display text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"><X size={18} /></button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Table({ headers, children, passbook }: { headers: string[]; children: ReactNode; passbook?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={cls("w-full text-left text-sm", passbook && "passbook")}>
        <thead>
          <tr className="border-b-2 border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {headers.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, right, mono, className }: { children: ReactNode; right?: boolean; mono?: boolean; className?: string }) {
  return <td className={cls("px-3 py-2.5 align-middle", right && "text-right", mono && "figures", className)}>{children}</td>;
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-8 text-center">
      <p className="display text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => (
        <button key={t} onClick={() => onChange(t)}
          className={cls(
            "rounded-t-lg px-3.5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary",
            t === active ? "border border-b-0 border-line bg-panel text-primary" : "text-ink-soft hover:text-ink"
          )}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="text-sm text-bad">{error instanceof Error ? error.message : String(error)}</p>;
}

export function Loading() {
  return <p className="p-4 text-sm text-ink-soft">Loading…</p>;
}
