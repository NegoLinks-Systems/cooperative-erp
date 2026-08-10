// @ts-nocheck
import { useMemo, useState, type FormEvent } from "react";
import { useTable, useInsert, useRpc, money, fmtDate, titleCase, supabase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Finance() {
  const { settings, isAdmin, isStaff } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Journals");

  const { data: accounts } = useTable("gl_accounts", { order: "code", asc: true });
  const { data: journals, isLoading } = useTable("journals");
  const { data: tb } = useTable("trial_balance", { order: "code", asc: true });

  const insertAccount = useInsert("gl_accounts");
  const postJournal = useRpc("post_journal", ["journals", "trial_balance", "dashboard"]);

  const [showAccount, setShowAccount] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [viewJournal, setViewJournal] = useState<Row | null>(null);
  const [aForm, setAForm] = useState<Row>({ code: "", name: "", type: "asset" });

  // Statements derived from posted trial balance
  const stmt = useMemo(() => {
    const rows = tb ?? [];
    const bal = (r: Row) => Number(r.total_debit) - Number(r.total_credit);
    const income = rows.filter((r) => r.type === "income").map((r) => ({ ...r, amount: -bal(r) }));
    const expense = rows.filter((r) => r.type === "expense").map((r) => ({ ...r, amount: bal(r) }));
    const assets = rows.filter((r) => r.type === "asset").map((r) => ({ ...r, amount: bal(r) }));
    const liabilities = rows.filter((r) => r.type === "liability").map((r) => ({ ...r, amount: -bal(r) }));
    const equity = rows.filter((r) => r.type === "equity").map((r) => ({ ...r, amount: -bal(r) }));
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);
    const surplus = totalIncome - totalExpense;
    return { income, expense, assets, liabilities, equity, totalIncome, totalExpense, surplus,
      totalAssets: assets.reduce((s, r) => s + r.amount, 0),
      totalLiabilities: liabilities.reduce((s, r) => s + r.amount, 0),
      totalEquity: equity.reduce((s, r) => s + r.amount, 0) + surplus };
  }, [tb]);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="General Ledger" sub="Journals, trial balance and financial statements" action={
        isStaff ? (
          <div className="flex gap-2">
            {isAdmin ? <Button variant="ghost" onClick={() => setShowAccount(true)}><Plus size={15} /> GL account</Button> : null}
            <Button onClick={() => setShowJournal(true)}><Plus size={16} /> Journal entry</Button>
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Journals", "Chart of Accounts", "Trial Balance", "Profit & Loss", "Balance Sheet"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Chart of Accounts" ? (
          <Card>
            <Table headers={["Code", "Account", "Type"]}>
              {(accounts ?? []).map((a) => (
                <tr key={a.id} className="border-b border-line">
                  <Td mono>{a.code}</Td>
                  <Td className="font-medium">{a.name}</Td>
                  <Td><Badge tone={a.type === "income" ? "good" : a.type === "expense" ? "bad" : "neutral"}>{titleCase(a.type)}</Badge></Td>
                </tr>
              ))}
            </Table>
          </Card>
        ) : null}

        {tab === "Journals" ? (
          <Card>
            {(journals ?? []).length === 0 ? <Empty title="No journal entries" hint="Record a journal entry to begin bookkeeping." /> : (
              <Table headers={["Journal №", "Date", "Memo", "Status", ""]}>
                {(journals ?? []).map((j) => (
                  <tr key={j.id} className="border-b border-line">
                    <Td mono>{j.journal_no}</Td>
                    <Td>{fmtDate(j.entry_date, settings.date_format)}</Td>
                    <Td>{j.memo ?? "—"}</Td>
                    <Td><Badge tone={j.status === "posted" ? "good" : j.status === "reversed" ? "bad" : "warn"}>{titleCase(j.status)}</Badge></Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setViewJournal(j)}>Lines</Button>
                        {j.status === "draft" ? <Button onClick={() => postJournal.mutateAsync({ p_journal: j.id }).catch((e) => alert(e.message))}>Post</Button> : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Trial Balance" ? (
          <Card>
            <Table headers={["Code", "Account", "Debit", "Credit"]} passbook>
              {(tb ?? []).map((r) => (
                <tr key={r.id}>
                  <Td mono>{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td mono right>{Number(r.total_debit) ? money(r.total_debit, sym) : ""}</Td>
                  <Td mono right>{Number(r.total_credit) ? money(r.total_credit, sym) : ""}</Td>
                </tr>
              ))}
              <tr className="font-semibold">
                <Td>—</Td><Td>Totals</Td>
                <Td mono right>{money((tb ?? []).reduce((s, r) => s + Number(r.total_debit), 0), sym)}</Td>
                <Td mono right>{money((tb ?? []).reduce((s, r) => s + Number(r.total_credit), 0), sym)}</Td>
              </tr>
            </Table>
            <Button variant="ghost" className="mt-3 no-print" onClick={() => window.print()}>Print</Button>
          </Card>
        ) : null}

        {tab === "Profit & Loss" ? (
          <Card title="Income & Expenditure Statement">
            <StatementBlock title="Income" rows={stmt.income} sym={sym} total={stmt.totalIncome} />
            <StatementBlock title="Expenditure" rows={stmt.expense} sym={sym} total={stmt.totalExpense} />
            <div className="mt-3 flex justify-between border-t-2 border-line pt-3 font-semibold">
              <span className="display">{stmt.surplus >= 0 ? "Surplus for the period" : "Deficit for the period"}</span>
              <span className="figures">{money(stmt.surplus, sym)}</span>
            </div>
            <Button variant="ghost" className="mt-3 no-print" onClick={() => window.print()}>Print</Button>
          </Card>
        ) : null}

        {tab === "Balance Sheet" ? (
          <Card title="Statement of Financial Position">
            <StatementBlock title="Assets" rows={stmt.assets} sym={sym} total={stmt.totalAssets} />
            <StatementBlock title="Liabilities" rows={stmt.liabilities} sym={sym} total={stmt.totalLiabilities} />
            <StatementBlock title="Equity (incl. current surplus)" rows={stmt.equity} sym={sym} total={stmt.totalEquity} />
            <div className="mt-3 flex justify-between border-t-2 border-line pt-3 text-sm">
              <span className="text-ink-soft">Liabilities + Equity</span>
              <span className="figures font-semibold">{money(stmt.totalLiabilities + stmt.totalEquity, sym)}</span>
            </div>
            <Button variant="ghost" className="mt-3 no-print" onClick={() => window.print()}>Print</Button>
          </Card>
        ) : null}
      </div>

      <Modal open={showAccount} onClose={() => setShowAccount(false)} title="New GL account">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); insertAccount.mutate(aForm, { onSuccess: () => setShowAccount(false) }); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input required value={aForm.code} onChange={(e) => setAForm({ ...aForm, code: e.target.value })} /></Field>
            <Field label="Type">
              <Select value={aForm.type} onChange={(e) => setAForm({ ...aForm, type: e.target.value })}>
                {["asset", "liability", "equity", "income", "expense"].map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Account name"><Input required value={aForm.name} onChange={(e) => setAForm({ ...aForm, name: e.target.value })} /></Field>
          <Button type="submit" className="w-full justify-center">Create account</Button>
        </form>
      </Modal>

      <JournalModal open={showJournal} onClose={() => setShowJournal(false)} accounts={accounts ?? []} journalCount={(journals ?? []).length} sym={sym} />
      {viewJournal ? <JournalLines journal={viewJournal} onClose={() => setViewJournal(null)} sym={sym} accounts={accounts ?? []} /> : null}
    </div>
  );
}

function StatementBlock({ title, rows, sym, total }: { title: string; rows: Row[]; sym: string; total: number }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="display text-sm font-semibold">{title}</h3>
      <ul className="mt-1 divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between py-1.5">
            <span><span className="figures text-ink-soft">{r.code}</span> {r.name}</span>
            <span className="figures">{money(r.amount, sym)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex justify-between border-t border-line pt-1.5 text-sm font-semibold">
        <span>Total {title.toLowerCase()}</span><span className="figures">{money(total, sym)}</span>
      </div>
    </div>
  );
}

function JournalModal({ open, onClose, accounts, journalCount, sym }: { open: boolean; onClose: () => void; accounts: Row[]; journalCount: number; sym: string }) {
  const insertJournal = useInsert("journals", ["trial_balance"]);
  const [memo, setMemo] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Row[]>([
    { account_id: "", debit: "", credit: "" },
    { account_id: "", debit: "", credit: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalDr = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCr = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totalDr > 0 && Math.abs(totalDr - totalCr) < 0.005;

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const journal_no = `JNL-${String(journalCount + 1).padStart(4, "0")}`;
      const { data, error: e1 } = await supabase.from("journals").insert({ journal_no, memo: memo || null, entry_date: entryDate }).select("id").single();
      if (e1) throw new Error(e1.message);
      const payload = lines
        .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
        .map((l) => ({ journal_id: data!.id, account_id: l.account_id, debit: Number(l.debit || 0), credit: Number(l.credit || 0) }));
      const { error: e2 } = await supabase.from("journal_lines").insert(payload);
      if (e2) throw new Error(e2.message);
      insertJournal.reset();
      onClose();
      setLines([{ account_id: "", debit: "", credit: "" }, { account_id: "", debit: "", credit: "" }]);
      setMemo("");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New journal entry" wide>
      <form className="space-y-4" onSubmit={save}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry date"><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></Field>
          <Field label="Memo"><Input value={memo} onChange={(e) => setMemo(e.target.value)} /></Field>
        </div>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_120px] gap-2">
            <Select value={l.account_id} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, account_id: e.target.value } : x))}>
              <option value="">Account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </Select>
            <Input type="number" min="0" step="0.01" placeholder="Debit" value={l.debit} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, debit: e.target.value, credit: "" } : x))} />
            <Input type="number" min="0" step="0.01" placeholder="Credit" value={l.credit} onChange={(e) => setLines(lines.map((x, j) => j === i ? { ...x, credit: e.target.value, debit: "" } : x))} />
          </div>
        ))}
        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="ghost" onClick={() => setLines([...lines, { account_id: "", debit: "", credit: "" }])}>Add line</Button>
          <span className={balanced ? "text-good" : "text-bad"}>
            Dr <span className="figures">{money(totalDr, sym)}</span> · Cr <span className="figures">{money(totalCr, sym)}</span> {balanced ? "— balanced" : "— not balanced"}
          </span>
        </div>
        <ErrorText error={error} />
        <Button type="submit" disabled={!balanced || busy} className="w-full justify-center">Save as draft</Button>
      </form>
    </Modal>
  );
}

function JournalLines({ journal, onClose, sym, accounts }: { journal: Row; onClose: () => void; sym: string; accounts: Row[] }) {
  const { data: lines, isLoading } = useTable("journal_lines", { order: "id", asc: true, filter: (q) => q.eq("journal_id", journal.id) });
  const nameOf = (id: string) => { const a = accounts.find((x) => x.id === id); return a ? `${a.code} — ${a.name}` : id; };
  return (
    <Modal open onClose={onClose} title={`${journal.journal_no} — ${journal.memo ?? "Journal lines"}`} wide>
      {isLoading ? <Loading /> : (
        <Table headers={["Account", "Debit", "Credit"]} passbook>
          {(lines ?? []).map((l) => (
            <tr key={l.id}>
              <Td>{nameOf(l.account_id)}</Td>
              <Td mono right>{Number(l.debit) ? money(l.debit, sym) : ""}</Td>
              <Td mono right>{Number(l.credit) ? money(l.credit, sym) : ""}</Td>
            </tr>
          ))}
        </Table>
      )}
    </Modal>
  );
}
