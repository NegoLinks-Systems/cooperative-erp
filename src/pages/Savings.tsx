// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTable, useInsert, useRpc, money, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Savings() {
  const { settings, isStaff, isAdmin } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Accounts");
  const qc = useQueryClient();

  const { data: products } = useTable("savings_products", { order: "name", asc: true });
  const { data: accounts, isLoading } = useTable("savings_accounts", { select: "*, members(full_name, member_number), savings_products(name, frequency)" });
  const { data: balances } = useTable("savings_balances", { order: "account_id", asc: true });
  const balanceOf = (id: string) => Number((balances ?? []).find((b) => b.account_id === id)?.balance ?? 0);

  const insertProduct = useInsert("savings_products");
  const insertAccount = useInsert("savings_accounts");
  const postTxn = useRpc("post_savings_txn", ["savings_transactions", "savings_balances", "dashboard"]);

  const [showProduct, setShowProduct] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [txnFor, setTxnFor] = useState<Row | null>(null);
  const [historyFor, setHistoryFor] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pForm, setPForm] = useState<Row>({ name: "", frequency: "monthly", interest_rate: 0, minimum_balance: 0, withdrawal_charge: 0 });
  const [aForm, setAForm] = useState<Row>({ member_id: "", product_id: "", target_amount: "", maturity_date: "" });
  const [tForm, setTForm] = useState<Row>({ direction: "deposit", amount: "", method: "cash", reference: "", narration: "" });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const { data: branches } = useTable("branches", { order: "name", asc: true });

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="Savings" sub="Daily, weekly, monthly, fixed, target, group and children's savings" action={
        isStaff ? (
          <div className="flex gap-2">
            {isAdmin ? <Button variant="ghost" onClick={() => setShowProduct(true)}><Plus size={15} /> Product</Button> : null}
            <Button onClick={() => setShowAccount(true)}><Plus size={16} /> Open account</Button>
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Accounts", "Products"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Products" ? (
          <Card>
            {(products ?? []).length === 0 ? <Empty title="No savings products" hint="Create a product to open member accounts." /> : (
              <Table headers={["Product", "Frequency", "Interest %", "Min balance", "Withdrawal charge"]}>
                {(products ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <Td className="font-medium">{p.name}</Td>
                    <Td><Badge>{titleCase(p.frequency)}</Badge></Td>
                    <Td mono right>{p.interest_rate}%</Td>
                    <Td mono right>{money(p.minimum_balance, sym)}</Td>
                    <Td mono right>{money(p.withdrawal_charge, sym)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : (
          <Card>
            {(accounts ?? []).length === 0 ? <Empty title="No savings accounts" hint="Open an account for an active member." /> : (
              <Table headers={["Account №", "Member", "Product", "Balance", "Status", "Opened", ""]} passbook>
                {(accounts ?? []).map((a) => (
                  <tr key={a.id}>
                    <Td mono>{a.account_number}</Td>
                    <Td className="font-medium">{a.members?.full_name} <span className="text-ink-soft">({a.members?.member_number})</span></Td>
                    <Td>{a.savings_products?.name}</Td>
                    <Td mono right>{money(balanceOf(a.id), sym)}</Td>
                    <Td><Badge tone={a.status === "active" ? "good" : a.status === "frozen" ? "warn" : "neutral"}>{titleCase(a.status)}</Badge></Td>
                    <Td>{fmtDate(a.opened_on, settings.date_format)}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setHistoryFor(a)}>Passbook</Button>
                        {isStaff ? <Button onClick={() => { setTxnFor(a); setTForm({ direction: "deposit", amount: "", method: "cash", reference: "", narration: "" }); }}>Post</Button> : null}
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </div>

      <Modal open={showProduct} onClose={() => setShowProduct(false)} title="New savings product">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); insertProduct.mutate(pForm, { onSuccess: () => setShowProduct(false) }); }}>
          <Field label="Product name"><Input required value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></Field>
          <Field label="Frequency / type">
            <Select value={pForm.frequency} onChange={(e) => setPForm({ ...pForm, frequency: e.target.value })}>
              {["daily", "weekly", "monthly", "fixed", "target", "group", "children", "shares"].map((f) => <option key={f} value={f}>{titleCase(f)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Interest % p.a."><Input type="number" step="0.001" min="0" value={pForm.interest_rate} onChange={(e) => setPForm({ ...pForm, interest_rate: e.target.value })} /></Field>
            <Field label="Min balance"><Input type="number" step="0.01" min="0" value={pForm.minimum_balance} onChange={(e) => setPForm({ ...pForm, minimum_balance: e.target.value })} /></Field>
            <Field label="W/D charge"><Input type="number" step="0.01" min="0" value={pForm.withdrawal_charge} onChange={(e) => setPForm({ ...pForm, withdrawal_charge: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertProduct.isPending} className="w-full justify-center">Create product</Button>
        </form>
      </Modal>

      <Modal open={showAccount} onClose={() => setShowAccount(false)} title="Open savings account">
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            const account_number = `SAV-${String(((accounts ?? []).length + 1)).padStart(5, "0")}`;
            await insertAccount.mutateAsync({
              account_number, member_id: aForm.member_id, product_id: aForm.product_id,
              branch_id: (branches ?? [])[0]?.id,
              target_amount: aForm.target_amount === "" ? null : Number(aForm.target_amount),
              maturity_date: aForm.maturity_date === "" ? null : aForm.maturity_date,
            });
            setShowAccount(false);
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <Field label="Member">
            <Select required value={aForm.member_id} onChange={(e) => setAForm({ ...aForm, member_id: e.target.value })}>
              <option value="">Select member…</option>
              {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
            </Select>
          </Field>
          <Field label="Product">
            <Select required value={aForm.product_id} onChange={(e) => setAForm({ ...aForm, product_id: e.target.value })}>
              <option value="">Select product…</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target amount (optional)"><Input type="number" step="0.01" value={aForm.target_amount} onChange={(e) => setAForm({ ...aForm, target_amount: e.target.value })} /></Field>
            <Field label="Maturity date (optional)"><Input type="date" value={aForm.maturity_date} onChange={(e) => setAForm({ ...aForm, maturity_date: e.target.value })} /></Field>
          </div>
          <ErrorText error={error} />
          <Button type="submit" disabled={insertAccount.isPending} className="w-full justify-center">Open account</Button>
        </form>
      </Modal>

      <Modal open={Boolean(txnFor)} onClose={() => setTxnFor(null)} title={`Post transaction — ${txnFor?.account_number ?? ""}`}>
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            await postTxn.mutateAsync({
              p_account: txnFor!.id, p_direction: tForm.direction, p_amount: Number(tForm.amount),
              p_method: tForm.method, p_reference: tForm.reference || null, p_narration: tForm.narration || null,
            });
            qc.invalidateQueries();
            setTxnFor(null);
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <p className="text-sm text-ink-soft">Current balance: <span className="figures text-ink">{money(balanceOf(txnFor?.id ?? ""), sym)}</span></p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction">
              <Select value={tForm.direction} onChange={(e) => setTForm({ ...tForm, direction: e.target.value })}>
                <option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option>
                <option value="charge">Charge</option><option value="interest">Interest</option>
              </Select>
            </Field>
            <Field label="Method">
              <Select value={tForm.method} onChange={(e) => setTForm({ ...tForm, method: e.target.value })}>
                <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option>
                <option value="pos">POS</option><option value="online">Online</option><option value="mobile_money">Mobile money</option>
              </Select>
            </Field>
          </div>
          <Field label={`Amount (${sym})`}><Input required type="number" min="0.01" step="0.01" value={tForm.amount} onChange={(e) => setTForm({ ...tForm, amount: e.target.value })} /></Field>
          <Field label="Reference"><Input value={tForm.reference} onChange={(e) => setTForm({ ...tForm, reference: e.target.value })} /></Field>
          <Field label="Narration"><Input value={tForm.narration} onChange={(e) => setTForm({ ...tForm, narration: e.target.value })} /></Field>
          <ErrorText error={error} />
          <Button type="submit" disabled={postTxn.isPending} className="w-full justify-center">Post transaction</Button>
        </form>
      </Modal>

      {historyFor ? <Passbook account={historyFor} onClose={() => setHistoryFor(null)} /> : null}
    </div>
  );
}

function Passbook({ account, onClose }: { account: Row; onClose: () => void }) {
  const { settings } = useApp();
  const sym = settings.currency_symbol;
  const { data: txns, isLoading } = useTable("savings_transactions", { order: "posted_at", asc: true, filter: (q) => q.eq("account_id", account.id) });
  let running = 0;
  return (
    <Modal open onClose={onClose} title={`Passbook — ${account.account_number}`} wide>
      {isLoading ? <Loading /> : (txns ?? []).length === 0 ? <Empty title="No entries" hint="Transactions posted to this account will appear here." /> : (
        <Table headers={["Date", "Narration", "Ref", "Debit", "Credit", "Balance"]} passbook>
          {(txns ?? []).map((t) => {
            const signed = ["deposit", "interest"].includes(t.direction) ? Number(t.amount) : -Number(t.amount);
            running += t.reversed ? 0 : signed;
            return (
              <tr key={t.id}>
                <Td>{fmtDate(t.posted_at, settings.date_format)}</Td>
                <Td>{t.narration ?? titleCase(t.direction)}</Td>
                <Td mono>{t.reference ?? "—"}</Td>
                <Td mono right>{signed < 0 ? money(-signed, sym) : ""}</Td>
                <Td mono right>{signed > 0 ? money(signed, sym) : ""}</Td>
                <Td mono right className="font-semibold">{money(running, sym)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Button variant="ghost" className="mt-4 no-print" onClick={() => window.print()}>Print statement</Button>
    </Modal>
  );
}
