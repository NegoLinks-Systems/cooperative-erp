import { useRef, useState, type FormEvent } from "react";
import { Sparkles, Send } from "lucide-react";
import { supabase } from "../lib/core";
import { askAssistant } from "../lib/assistant";
import { useApp } from "../contexts/AppContext";
import { PageTitle } from "../components/Layout";
import { Button, Card, Input, cls } from "../components/ui";

interface Turn { role: "user" | "assistant"; text: string }

const STARTERS = [
  "Assess the credit risk in our current loan portfolio",
  "Forecast savings growth for the next quarter",
  "Draft a notice inviting members to the next AGM",
  "Which loans look likely to become delinquent?",
  "Draft minutes template for a board meeting",
];

export default function Assistant() {
  const { settings, isStaff } = useApp();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function send(prompt: string) {
    if (!prompt.trim() || busy) return;
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    setBusy(true);
    try {
      // Assemble live system context so answers use real data (staff only)
      let context = "";
      if (isStaff) {
        const [{ count: members }, { data: bal }, { data: lp }] = await Promise.all([
          supabase.from("members").select("*", { count: "exact", head: true }),
          supabase.from("savings_balances").select("balance"),
          supabase.from("loan_positions").select("status,principal,outstanding,total_paid,total_payable,first_overdue"),
        ]);
        const savings = (bal ?? []).reduce((s, r: any) => s + Number(r.balance), 0);
        const active = (lp ?? []).filter((l: any) => ["disbursed", "active", "restructured"].includes(l.status));
        const overdue = active.filter((l: any) => l.first_overdue).length;
        context =
          `Live system data (${settings.currency_code}): members=${members ?? 0}; total savings=${savings}; ` +
          `active loans=${active.length}; overdue loans=${overdue}; ` +
          `portfolio=${active.reduce((s: number, l: any) => s + Number(l.principal), 0)}; ` +
          `outstanding=${active.reduce((s: number, l: any) => s + Number(l.outstanding), 0)}.`;
      }
      const reply = await askAssistant(prompt, context);
      setTurns((t) => [...t, { role: "assistant", text: reply }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollTo({ top: 999999, behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={settings.ai_assistant_name} sub="Credit analysis, forecasting, drafting and answers from live system data" />
      <Card>
        <div ref={scroller} className="max-h-[55vh] space-y-3 overflow-y-auto pb-2">
          {turns.length === 0 ? (
            <div className="py-6 text-center">
              <Sparkles className="mx-auto text-brass" size={28} />
              <p className="mt-2 text-sm text-ink-soft">Ask {settings.ai_assistant_name} anything about your cooperative's operations.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft hover:border-primary hover:text-primary">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : turns.map((t, i) => (
            <div key={i} className={cls("max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              t.role === "user" ? "ml-auto bg-primary text-white" : "bg-surface border border-line")}>
              {t.text}
            </div>
          ))}
          {busy ? <div className="max-w-[85%] rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink-soft">Thinking…</div> : null}
        </div>
        <form className="mt-3 flex gap-2 border-t border-line pt-3" onSubmit={(e: FormEvent) => { e.preventDefault(); send(input); }}>
          <Input placeholder={`Message ${settings.ai_assistant_name}…`} value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" disabled={busy || !input.trim()} aria-label="Send"><Send size={16} /></Button>
        </form>
      </Card>
    </div>
  );
}
