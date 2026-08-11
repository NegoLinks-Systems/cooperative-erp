import { useRef, useState, type FormEvent } from "react";
import { Sparkles, Send, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/core";
import { askAI } from "@/lib/ai/client";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Button } from "@/components/negolinks/ui";

interface Turn { role: "user" | "assistant"; text: string }

const STARTERS = [
  "Assess the credit risk in our current loan portfolio",
  "Generate a forecast for savings growth next quarter",
  "Draft a notice inviting members to the next AGM",
  "Which loans look likely to become delinquent?",
  "Summarize our governance activity this year",
  "Draft board meeting minutes template",
  "Analyze our dividend distribution history",
];

export default function AIAssistant() {
  const { settings, isStaff } = useApp();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const aiName = settings.ai_assistant_name ?? "AI Assistance";

  async function send(prompt: string) {
    if (!prompt.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    setBusy(true);
    try {
      let context = "";
      if (isStaff) {
        const [{ count: members }, { data: bal }, { data: lp }] = await Promise.all([
          supabase.from("members").select("*", { count: "exact", head: true }),
          supabase.from("savings_balances").select("balance"),
          supabase.from("loan_positions").select("status,principal,outstanding"),
        ]);
        const savings = (bal ?? []).reduce((s, r) => s + Number((r as {balance: number}).balance), 0);
        const active = (lp ?? []).filter((l) => ["disbursed","active","restructured"].includes((l as {status: string}).status));
        const overdue = active.filter((l) => (l as {outstanding: number}).outstanding > 0).length;
        context = `Members: ${members ?? 0}. Savings: ₦${savings.toLocaleString()}. Active loans: ${active.length}, overdue: ${overdue}.`;
      }
      const reply = await askAI(prompt, context, "assistant");
      setTurns((t) => [...t, { role: "assistant", text: reply }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", text: "AI Assistance is currently unavailable. Please check Settings → AI Platform to configure your AI provider." }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageTitle
        title={aiName}
        sub="NegoLinks Intelligence Engine · Credit analysis, forecasting, drafting, and live data insights"
        action={
          turns.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setTurns([])}><RefreshCw size={12} /> New conversation</Button>
          ) : undefined
        }
      />

      <Card accent className="flex flex-col" style={{ minHeight: 500 }}>
        {/* Chat area */}
        <div ref={scroller} className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[60vh]" style={{ minHeight: 300 }}>
          {turns.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-float"
                style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))", boxShadow: "0 0 40px var(--accent-glow)" }}>
                <Sparkles size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{aiName}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-6">Powered by NegoLinks Intelligence Engine</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="px-3 py-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--accent-light)] hover:border-[var(--accent-border)] transition-all"
                    style={{ border: "1px solid var(--bg-border)", background: "var(--bg-surface)" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === "user"
                    ? "text-white"
                    : "text-[var(--text-secondary)]"
                }`} style={t.role === "user"
                  ? { background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                  {t.role === "assistant" ? (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={11} style={{ color: "var(--gold)" }} />
                      <span className="text-xs font-semibold gradient-text-gold">{aiName}</span>
                    </div>
                  ) : null}
                  {t.text}
                </div>
              </div>
            ))
          )}
          {busy ? (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl text-sm text-[var(--text-muted)] flex items-center gap-2"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                <div className="flex gap-1">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                Thinking…
              </div>
            </div>
          ) : null}
        </div>

        {/* Input */}
        <form className="flex gap-2 border-t border-[var(--bg-border)] pt-4"
          onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${aiName}…`}
            className="nl-input flex-1 text-sm" />
          <Button type="submit" disabled={busy || !input.trim()} size="md">
            <Send size={15} />
          </Button>
        </form>
      </Card>

      <p className="text-xs text-center text-[var(--text-muted)]">
        NegoLinks Intelligence Engine · Responses are AI-generated and should be reviewed before action.
      </p>
    </div>
  );
}
