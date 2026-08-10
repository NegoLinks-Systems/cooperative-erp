// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useTable, useInsert, useUpdate, useRpc, money, fmtDate, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Shares() {
  const { settings, isStaff, isAdmin } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Share purchases");

  const { data: shareSettings } = useTable("share_settings", { order: "id", asc: true });
  const sharePrice = Number((shareSettings ?? [])[0]?.share_price ?? 100);
  const { data: purchases, isLoading } = useTable("share_purchases", { select: "*, members(full_name, member_number)" });
  const { data: declarations } = useTable("dividend_declarations");
  const { data: payouts } = useTable("dividend_payouts", { select: "*, members(full_name, member_number)", order: "id", asc: true });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });

  const insertPurchase = useInsert("share_purchases");
  const insertDeclaration = useInsert("dividend_declarations");
  const updateSettings = useUpdate("share_settings");
  const updatePayout = useUpdate("dividend_payouts");
  const distribute = useRpc("distribute_dividends", ["dividend_declarations", "dividend_payouts", "dashboard"]);

  const [showBuy, setShowBuy] = useState(false);
  const [showDeclare, setShowDeclare] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buy, setBuy] = useState<Row>({ member_id: "", units: "", is_bonus: false });
  const [decl, setDecl] = useState<Row>({ financial_year: String(new Date().getFullYear() - 1), rate_percent: "" });

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="Shares & Dividends" sub={`Current share price: ${money(sharePrice, sym)} per unit`} action={
        isStaff ? (
          <div className="flex gap-2">
            {isAdmin ? <Button variant="ghost" onClick={() => setShowDeclare(true)}><Plus size={15} /> Declare dividend</Button> : null}
            <Button onClick={() => setShowBuy(true)}><Plus size={16} /> Record purchase</Button>
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Share purchases", "Dividends"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Share purchases" ? (
          <Card>
            {isAdmin ? (
              <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const el = (e.target as HTMLFormElement).elements.namedItem("price") as HTMLInputElement;
                updateSettings.mutate({ id: 1, values: { share_price: Number(el.value), updated_at: new Date().toISOString() } });
              }}>
                <Field label={`Share price (${sym})`}><Input name="price" type="number" min="0.01" step="0.01" defaultValue={sharePrice} className="max-w-[160px]" /></Field>
                <Button type="submit" variant="ghost">Update price</Button>
              </form>
            ) : null}
            {(purchases ?? []).length === 0 ? <Empty title="No share purchases" hint="Record a member's share purchase to issue a certificate." /> : (
              <Table headers={["Certificate №", "Member", "Units", "Unit price", "Amount", "Type", "Date"]} passbook>
                {(purchases ?? []).map((p) => (
                  <tr key={p.id}>
                    <Td mono>{p.certificate_no}</Td>
                    <Td className="font-medium">{p.members?.full_name}</Td>
                    <Td mono right>{p.units}</Td>
                    <Td mono right>{money(p.unit_price, sym)}</Td>
                    <Td mono right className="font-semibold">{money(p.amount, sym)}</Td>
                    <Td>{p.is_bonus ? <Badge tone="brass">Bonus</Badge> : <Badge tone="good">Purchase</Badge>}</Td>
                    <Td>{fmtDate(p.purchased_on, settings.date_format)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : (
          <div className="space-y-5">
            <Card title="Declarations">
              {(declarations ?? []).length === 0 ? <Empty title="No dividend declarations" hint="Declare a dividend rate for a financial year to distribute to shareholders." /> : (
                <Table headers={["Financial year", "Rate", "Declared", "Status", ""]}>
                  {(declarations ?? []).map((d) => (
                    <tr key={d.id} className="border-b border-line">
                      <Td mono>{d.financial_year}</Td>
                      <Td mono>{d.rate_percent}%</Td>
                      <Td>{fmtDate(d.declared_on, settings.date_format)}</Td>
                      <Td><Badge tone={d.status === "distributed" ? "good" : "warn"}>{d.status === "distributed" ? "Distributed" : "Declared"}</Badge></Td>
                      <Td>{isAdmin && d.status === "declared" ? (
                        <Button onClick={() => distribute.mutateAsync({ p_declaration: d.id }).catch((e) => alert(e.message))}>Distribute</Button>
                      ) : null}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card title="Payouts">
              {(payouts ?? []).length === 0 ? <Empty title="No payouts yet" hint="Distributing a declaration creates a payout per shareholder." /> : (
                <Table headers={["Member", "Share value", "Dividend", "Paid", ""]} passbook>
                  {(payouts ?? []).map((p) => (
                    <tr key={p.id}>
                      <Td className="font-medium">{p.members?.full_name}</Td>
                      <Td mono right>{money(p.share_value, sym)}</Td>
                      <Td mono right className="font-semibold">{money(p.amount, sym)}</Td>
                      <Td>{p.paid ? <Badge tone="good">Paid</Badge> : <Badge tone="warn">Pending</Badge>}</Td>
                      <Td>{isStaff && !p.paid ? <Button variant="ghost" onClick={() => updatePayout.mutate({ id: p.id, values: { paid: true, paid_at: new Date().toISOString() } })}>Mark paid</Button> : null}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </div>

      <Modal open={showBuy} onClose={() => setShowBuy(false)} title="Record share purchase">
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            const certificate_no = `CERT-${String((purchases ?? []).length + 1).padStart(4, "0")}`;
            await insertPurchase.mutateAsync({ member_id: buy.member_id, units: Number(buy.units), unit_price: sharePrice, certificate_no, is_bonus: buy.is_bonus });
            setShowBuy(false); setBuy({ member_id: "", units: "", is_bonus: false });
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <Field label="Member">
            <Select required value={buy.member_id} onChange={(e) => setBuy({ ...buy, member_id: e.target.value })}>
              <option value="">Select member…</option>
              {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Units"><Input required type="number" min="1" value={buy.units} onChange={(e) => setBuy({ ...buy, units: e.target.value })} /></Field>
            <Field label="Amount"><Input readOnly value={money(Number(buy.units || 0) * sharePrice, sym)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={buy.is_bonus} onChange={(e) => setBuy({ ...buy, is_bonus: e.target.checked })} /> Bonus shares (no cash received)
          </label>
          <ErrorText error={error} />
          <Button type="submit" disabled={insertPurchase.isPending} className="w-full justify-center">Issue certificate</Button>
        </form>
      </Modal>

      <Modal open={showDeclare} onClose={() => setShowDeclare(false)} title="Declare dividend">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertDeclaration.mutate({ financial_year: decl.financial_year, rate_percent: Number(decl.rate_percent) }, { onSuccess: () => setShowDeclare(false) });
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Financial year"><Input required value={decl.financial_year} onChange={(e) => setDecl({ ...decl, financial_year: e.target.value })} /></Field>
            <Field label="Rate % of share value"><Input required type="number" min="0.001" step="0.001" value={decl.rate_percent} onChange={(e) => setDecl({ ...decl, rate_percent: e.target.value })} /></Field>
          </div>
          <p className="text-sm text-ink-soft">Distribution computes each member's total share value and credits the declared percentage as a payout.</p>
          <Button type="submit" disabled={insertDeclaration.isPending} className="w-full justify-center">Declare</Button>
        </form>
      </Modal>
    </div>
  );
}
