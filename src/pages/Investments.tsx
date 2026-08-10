// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useTable, useInsert, useUpdate, money, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";
import { Plus } from "lucide-react";

export default function Investments() {
  const { settings, isStaff } = useApp();
  const sym = settings.currency_symbol;
  const { data: investments, isLoading } = useTable("investments");
  const { data: returns } = useTable("investment_returns", { order: "received_on", asc: false });
  const insert = useInsert("investments", ["dashboard"]);
  const update = useUpdate("investments", ["dashboard"]);
  const insertReturn = useInsert("investment_returns");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({ title: "", kind: "fixed_deposit", institution: "", principal: "", rate_percent: "", maturity_date: "", notes: "" });

  const active = (investments ?? []).filter((i) => i.status === "active");
  const totalPrincipal = active.reduce((s, i) => s + Number(i.principal), 0);
  const totalReturns = (returns ?? []).reduce((s, r) => s + Number(r.amount), 0);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="Investments" sub="Fixed deposits, treasury and cooperative investments" action={
        isStaff ? <Button onClick={() => setShowNew(true)}><Plus size={16} /> New investment</Button> : undefined
      } />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Active portfolio" value={money(totalPrincipal, sym)} sub={`${active.length} instruments`} />
        <StatCard label="Returns received" value={money(totalReturns, sym)} />
        <StatCard label="Blended rate" value={`${active.length ? (active.reduce((s, i) => s + Number(i.rate_percent), 0) / active.length).toFixed(2) : "0.00"}%`} />
      </div>
      <Card>
        {(investments ?? []).length === 0 ? <Empty title="No investments recorded" hint="Record a placement to track its returns." /> : (
          <Table headers={["Title", "Type", "Institution", "Principal", "Rate", "Maturity", "Status", ""]} passbook>
            {(investments ?? []).map((i) => (
              <tr key={i.id}>
                <Td className="font-medium">{i.title}</Td>
                <Td><Badge>{titleCase(i.kind)}</Badge></Td>
                <Td>{i.institution ?? "—"}</Td>
                <Td mono right>{money(i.principal, sym)}</Td>
                <Td mono right>{i.rate_percent}%</Td>
                <Td>{fmtDate(i.maturity_date, settings.date_format)}</Td>
                <Td><Badge tone={i.status === "active" ? "good" : i.status === "matured" ? "brass" : "neutral"}>{titleCase(i.status)}</Badge></Td>
                <Td><Button variant="ghost" onClick={() => setDetail(i)}>Open</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New investment">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insert.mutate({
            ...form, principal: Number(form.principal), rate_percent: Number(form.rate_percent || 0),
            maturity_date: form.maturity_date || null, institution: form.institution || null, notes: form.notes || null,
          }, { onSuccess: () => setShowNew(false) });
        }}>
          <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="fixed_deposit">Fixed deposit</option><option value="treasury">Treasury</option>
                <option value="cooperative">Cooperative</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Institution"><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
            <Field label={`Principal (${sym})`}><Input required type="number" min="1" step="0.01" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} /></Field>
            <Field label="Rate % p.a."><Input type="number" min="0" step="0.001" value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} /></Field>
            <Field label="Maturity date"><Input type="date" value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button type="submit" disabled={insert.isPending} className="w-full justify-center">Record investment</Button>
        </form>
      </Modal>

      {detail ? (
        <Modal open onClose={() => setDetail(null)} title={detail.title} wide>
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge>{titleCase(detail.kind)}</Badge>
            <span>Principal <span className="figures font-semibold">{money(detail.principal, sym)}</span></span>
            <span>Rate <span className="figures">{detail.rate_percent}%</span></span>
            <span>Start {fmtDate(detail.start_date, settings.date_format)}</span>
          </div>
          {isStaff ? (
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
              <Field label="Status">
                <Select defaultValue={detail.status} onChange={(e) => update.mutate({ id: detail.id, values: { status: e.target.value } })}>
                  <option value="active">Active</option><option value="matured">Matured</option><option value="liquidated">Liquidated</option>
                </Select>
              </Field>
              <form className="flex items-end gap-2" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const el = (e.target as HTMLFormElement).elements.namedItem("amt") as HTMLInputElement;
                insertReturn.mutate({ investment_id: detail.id, amount: Number(el.value) });
                el.value = "";
              }}>
                <Field label={`Record return (${sym})`}><Input name="amt" required type="number" min="0.01" step="0.01" className="max-w-[160px]" /></Field>
                <Button type="submit" variant="ghost">Add return</Button>
              </form>
            </div>
          ) : null}
          <h3 className="display mt-4 border-t border-line pt-4 text-sm font-semibold">Returns received</h3>
          {(returns ?? []).filter((r) => r.investment_id === detail.id).length === 0 ? <p className="mt-1 text-sm text-ink-soft">None yet.</p> : (
            <ul className="mt-1 divide-y divide-line text-sm">
              {(returns ?? []).filter((r) => r.investment_id === detail.id).map((r) => (
                <li key={r.id} className="flex justify-between py-2">
                  <span>{fmtDate(r.received_on, settings.date_format)}</span>
                  <span className="figures font-semibold">{money(r.amount, sym)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
