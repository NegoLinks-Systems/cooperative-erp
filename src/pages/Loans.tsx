// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTable, useInsert, useRpc, money, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

const TONE: Record<string, "good" | "bad" | "warn" | "neutral" | "info" | "brass"> = {
  submitted: "warn", under_review: "warn", approved: "info", rejected: "bad",
  disbursed: "good", active: "good", restructured: "brass", written_off: "bad", closed: "neutral", draft: "neutral",
};

export default function Loans() {
  const { settings, isStaff, isAdmin, role } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Applications");
  const qc = useQueryClient();

  const { data: products } = useTable("loan_products", { order: "name", asc: true });
  const { data: loans, isLoading } = useTable("loans", { select: "*, members(full_name, member_number), loan_products(name, interest_rate, method)" });
  const { data: positions } = useTable("loan_positions", { order: "loan_id", asc: true });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const { data: branches } = useTable("branches", { order: "name", asc: true });
  const posOf = (id: string) => (positions ?? []).find((p) => p.loan_id === id);

  const insertProduct = useInsert("loan_products");
  const insertLoan = useInsert("loans");
  const approve = useRpc("approve_loan", ["loans", "loan_positions", "dashboard"]);
  const reject = useRpc("reject_loan", ["loans"]);
  const disburse = useRpc("disburse_loan", ["loans", "loan_schedule", "loan_positions", "dashboard"]);
  const writeOff = useRpc("write_off_loan", ["loans", "loan_positions"]);

  const [showProduct, setShowProduct] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pForm, setPForm] = useState<Row>({ name: "", interest_rate: 12, method: "reducing_balance", max_tenor_months: 24, processing_fee_percent: 1, requires_guarantors: 1 });
  const [lForm, setLForm] = useState<Row>({ member_id: "", product_id: "", principal: "", tenor_months: 12, purpose: "" });

  const canApprove = ["super_admin", "org_owner", "managing_director", "branch_manager", "loan_officer"].includes(role);
  const canDisburse = ["super_admin", "org_owner", "managing_director", "branch_manager", "accountant", "finance_officer"].includes(role);

  if (isLoading) return <Loading />;

  return (
    <div>
      <PageTitle title="Loans" sub="Applications, approvals, disbursement and recovery" action={
        isStaff ? (
          <div className="flex gap-2">
            {isAdmin ? <Button variant="ghost" onClick={() => setShowProduct(true)}><Plus size={15} /> Product</Button> : null}
            <Button onClick={() => setShowApply(true)}><Plus size={16} /> New application</Button>
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Applications", "Products"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Products" ? (
          <Card>
            {(products ?? []).length === 0 ? <Empty title="No loan products" hint="Create a product to accept applications." /> : (
              <Table headers={["Product", "Interest % p.a.", "Method", "Max tenor", "Fee %", "Guarantors"]}>
                {(products ?? []).map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <Td className="font-medium">{p.name}</Td>
                    <Td mono right>{p.interest_rate}%</Td>
                    <Td><Badge>{titleCase(p.method)}</Badge></Td>
                    <Td mono right>{p.max_tenor_months} mo</Td>
                    <Td mono right>{p.processing_fee_percent}%</Td>
                    <Td mono right>{p.requires_guarantors}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : (
          <Card>
            {(loans ?? []).length === 0 ? <Empty title="No loan applications" hint="Submit an application on behalf of a member." /> : (
              <Table headers={["Loan №", "Member", "Product", "Principal", "Outstanding", "Status", "Applied", ""]} passbook>
                {(loans ?? []).map((l) => (
                  <tr key={l.id}>
                    <Td mono>{l.loan_number}</Td>
                    <Td className="font-medium">{l.members?.full_name}</Td>
                    <Td>{l.loan_products?.name}</Td>
                    <Td mono right>{money(l.principal, sym)}</Td>
                    <Td mono right>{money(posOf(l.id)?.outstanding ?? 0, sym)}</Td>
                    <Td><Badge tone={TONE[l.status] ?? "neutral"}>{titleCase(l.status)}</Badge></Td>
                    <Td>{fmtDate(l.applied_on, settings.date_format)}</Td>
                    <Td><Button variant="ghost" onClick={() => setDetail(l)}>Open</Button></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        )}
      </div>

      <Modal open={showProduct} onClose={() => setShowProduct(false)} title="New loan product">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); insertProduct.mutate(pForm, { onSuccess: () => setShowProduct(false) }); }}>
          <Field label="Product name"><Input required value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Interest % p.a."><Input required type="number" step="0.001" min="0" value={pForm.interest_rate} onChange={(e) => setPForm({ ...pForm, interest_rate: e.target.value })} /></Field>
            <Field label="Interest method">
              <Select value={pForm.method} onChange={(e) => setPForm({ ...pForm, method: e.target.value })}>
                <option value="reducing_balance">Reducing balance</option><option value="flat">Flat</option>
              </Select>
            </Field>
            <Field label="Max tenor (months)"><Input type="number" min="1" value={pForm.max_tenor_months} onChange={(e) => setPForm({ ...pForm, max_tenor_months: e.target.value })} /></Field>
            <Field label="Processing fee %"><Input type="number" step="0.001" min="0" value={pForm.processing_fee_percent} onChange={(e) => setPForm({ ...pForm, processing_fee_percent: e.target.value })} /></Field>
            <Field label="Guarantors required"><Input type="number" min="0" value={pForm.requires_guarantors} onChange={(e) => setPForm({ ...pForm, requires_guarantors: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertProduct.isPending} className="w-full justify-center">Create product</Button>
        </form>
      </Modal>

      <Modal open={showApply} onClose={() => setShowApply(false)} title="New loan application">
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            const loan_number = `LN-${String((loans ?? []).length + 1).padStart(4, "0")}`;
            await insertLoan.mutateAsync({
              loan_number, member_id: lForm.member_id, product_id: lForm.product_id,
              branch_id: (branches ?? [])[0]?.id, principal: Number(lForm.principal),
              tenor_months: Number(lForm.tenor_months), purpose: lForm.purpose || null,
            });
            setShowApply(false);
            setLForm({ member_id: "", product_id: "", principal: "", tenor_months: 12, purpose: "" });
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <Field label="Member">
            <Select required value={lForm.member_id} onChange={(e) => setLForm({ ...lForm, member_id: e.target.value })}>
              <option value="">Select member…</option>
              {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
            </Select>
          </Field>
          <Field label="Product">
            <Select required value={lForm.product_id} onChange={(e) => setLForm({ ...lForm, product_id: e.target.value })}>
              <option value="">Select product…</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.interest_rate}% {titleCase(p.method)}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Principal (${sym})`}><Input required type="number" min="1" step="0.01" value={lForm.principal} onChange={(e) => setLForm({ ...lForm, principal: e.target.value })} /></Field>
            <Field label="Tenor (months)"><Input required type="number" min="1" value={lForm.tenor_months} onChange={(e) => setLForm({ ...lForm, tenor_months: e.target.value })} /></Field>
          </div>
          <Field label="Purpose"><Textarea rows={2} value={lForm.purpose} onChange={(e) => setLForm({ ...lForm, purpose: e.target.value })} /></Field>
          <ErrorText error={error} />
          <Button type="submit" disabled={insertLoan.isPending} className="w-full justify-center">Submit application</Button>
        </form>
      </Modal>

      {detail ? (
        <LoanDetail
          loan={detail}
          onClose={() => setDetail(null)}
          canApprove={canApprove}
          canDisburse={canDisburse}
          isAdmin={isAdmin}
          onAction={async (fn: () => Promise<unknown>) => {
            setError(null);
            try { await fn(); qc.invalidateQueries(); setDetail(null); }
            catch (err) { alert(err instanceof Error ? err.message : "Action failed"); }
          }}
          approve={approve} reject={reject} disburse={disburse} writeOff={writeOff}
        />
      ) : null}
    </div>
  );
}

function LoanDetail(props: {
  loan: Row; onClose: () => void; canApprove: boolean; canDisburse: boolean; isAdmin: boolean;
  onAction: (fn: () => Promise<unknown>) => void;
  approve: ReturnType<typeof useRpc>; reject: ReturnType<typeof useRpc>;
  disburse: ReturnType<typeof useRpc>; writeOff: ReturnType<typeof useRpc>;
}) {
  const { loan, onClose, canApprove, canDisburse, isAdmin, onAction, approve, reject, disburse, writeOff } = props;
  const { settings, isStaff } = useApp();
  const sym = settings.currency_symbol;
  const { data: schedule } = useTable("loan_schedule", { order: "installment_no", asc: true, filter: (q) => q.eq("loan_id", loan.id) });
  const { data: repayments } = useTable("loan_repayments", { order: "posted_at", asc: true, filter: (q) => q.eq("loan_id", loan.id) });
  const { data: guarantors } = useTable("loan_guarantors", { select: "*, members:guarantor_member_id(full_name, member_number)", filter: (q) => q.eq("loan_id", loan.id) });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const insertRepayment = useInsert("loan_repayments", ["loan_positions", "dashboard"]);
  const insertGuarantor = useInsert("loan_guarantors");
  const [repay, setRepay] = useState<Row>({ amount: "", method: "cash", reference: "" });
  const [guar, setGuar] = useState<Row>({ guarantor_member_id: "", amount_guaranteed: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [disburseMethod, setDisburseMethod] = useState("bank_transfer");

  const totalPaid = (repayments ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalDue = (schedule ?? []).reduce((s, r) => s + Number(r.total_due), 0);

  return (
    <Modal open onClose={onClose} title={`${loan.loan_number} — ${loan.members?.full_name ?? ""}`} wide>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={TONE[loan.status] ?? "neutral"}>{titleCase(loan.status)}</Badge>
        <span>Principal <span className="figures font-semibold">{money(loan.principal, sym)}</span></span>
        <span>Tenor <span className="figures">{loan.tenor_months} mo</span></span>
        <span>Product {loan.loan_products?.name} ({loan.loan_products?.interest_rate}% {titleCase(loan.loan_products?.method ?? "")})</span>
        {totalDue > 0 ? <span>Outstanding <span className="figures font-semibold">{money(totalDue - totalPaid, sym)}</span></span> : null}
      </div>
      {loan.purpose ? <p className="mt-2 text-sm text-ink-soft">Purpose: {loan.purpose}</p> : null}
      {loan.rejection_reason ? <p className="mt-2 text-sm text-bad">Rejected: {loan.rejection_reason}</p> : null}

      {isStaff && ["submitted", "under_review"].includes(loan.status) ? (
        <div className="mt-4 space-y-3 rounded-lg border border-line p-4">
          <p className="text-sm font-semibold">Approval decision</p>
          <div className="flex flex-wrap gap-2">
            {canApprove ? <Button onClick={() => onAction(() => approve.mutateAsync({ p_loan: loan.id }))}>Approve loan</Button> : null}
            <Input placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="max-w-xs" />
            <Button variant="danger" disabled={!rejectReason} onClick={() => onAction(() => reject.mutateAsync({ p_loan: loan.id, p_reason: rejectReason }))}>Reject</Button>
          </div>
        </div>
      ) : null}

      {isStaff && loan.status === "approved" && canDisburse ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-line p-4">
          <Field label="Disbursement method">
            <Select value={disburseMethod} onChange={(e) => setDisburseMethod(e.target.value)}>
              <option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option>
              <option value="pos">POS</option><option value="online">Online</option><option value="mobile_money">Mobile money</option>
            </Select>
          </Field>
          <Button onClick={() => onAction(() => disburse.mutateAsync({ p_loan: loan.id, p_method: disburseMethod }))}>Disburse & generate schedule</Button>
        </div>
      ) : null}

      <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Guarantors</h3>
      {(guarantors ?? []).length === 0 ? <p className="mt-1 text-sm text-ink-soft">No guarantors recorded.</p> : (
        <ul className="mt-1 divide-y divide-line text-sm">
          {(guarantors ?? []).map((g) => (
            <li key={g.id} className="flex justify-between py-2">
              <span>{g.members?.full_name} <span className="text-ink-soft">({g.members?.member_number})</span></span>
              <span className="figures">{money(g.amount_guaranteed, sym)} {g.accepted ? <Badge tone="good">Accepted</Badge> : <Badge tone="warn">Pending</Badge>}</span>
            </li>
          ))}
        </ul>
      )}
      {isStaff && !["closed", "written_off", "rejected"].includes(loan.status) ? (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertGuarantor.mutate({ loan_id: loan.id, guarantor_member_id: guar.guarantor_member_id, amount_guaranteed: Number(guar.amount_guaranteed), accepted: true });
          setGuar({ guarantor_member_id: "", amount_guaranteed: "" });
        }}>
          <Select required value={guar.guarantor_member_id} onChange={(e) => setGuar({ ...guar, guarantor_member_id: e.target.value })} className="max-w-xs">
            <option value="">Add guarantor…</option>
            {(members ?? []).filter((m) => m.id !== loan.member_id).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </Select>
          <Input required type="number" min="1" step="0.01" placeholder="Amount guaranteed" value={guar.amount_guaranteed} onChange={(e) => setGuar({ ...guar, amount_guaranteed: e.target.value })} className="max-w-[180px]" />
          <Button type="submit" variant="ghost">Add</Button>
        </form>
      ) : null}

      {(schedule ?? []).length > 0 ? (
        <>
          <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Repayment schedule</h3>
          <Table headers={["#", "Due date", "Principal", "Interest", "Total"]} passbook>
            {(schedule ?? []).map((s) => (
              <tr key={s.id}>
                <Td mono>{s.installment_no}</Td>
                <Td>{fmtDate(s.due_date, settings.date_format)}</Td>
                <Td mono right>{money(s.principal_due, sym)}</Td>
                <Td mono right>{money(s.interest_due, sym)}</Td>
                <Td mono right className="font-semibold">{money(s.total_due, sym)}</Td>
              </tr>
            ))}
          </Table>
        </>
      ) : null}

      {["disbursed", "active", "restructured"].includes(loan.status) ? (
        <>
          <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Repayments — paid {money(totalPaid, sym)} of {money(totalDue, sym)}</h3>
          {isStaff ? (
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
              e.preventDefault();
              insertRepayment.mutate({ loan_id: loan.id, amount: Number(repay.amount), method: repay.method, reference: repay.reference || null });
              setRepay({ amount: "", method: "cash", reference: "" });
            }}>
              <Input required type="number" min="0.01" step="0.01" placeholder={`Amount (${sym})`} value={repay.amount} onChange={(e) => setRepay({ ...repay, amount: e.target.value })} className="max-w-[160px]" />
              <Select value={repay.method} onChange={(e) => setRepay({ ...repay, method: e.target.value })} className="max-w-[170px]">
                <option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option>
                <option value="pos">POS</option><option value="online">Online</option><option value="mobile_money">Mobile money</option>
              </Select>
              <Input placeholder="Reference" value={repay.reference} onChange={(e) => setRepay({ ...repay, reference: e.target.value })} className="max-w-[160px]" />
              <Button type="submit" disabled={insertRepayment.isPending}>Post repayment</Button>
            </form>
          ) : null}
          {(repayments ?? []).length > 0 ? (
            <ul className="mt-3 divide-y divide-line text-sm">
              {(repayments ?? []).map((r) => (
                <li key={r.id} className="flex justify-between py-2">
                  <span>{fmtDate(r.posted_at, settings.date_format)} · {titleCase(r.method)} {r.reference ? `· ${r.reference}` : ""}</span>
                  <span className="figures font-semibold">{money(r.amount, sym)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {isAdmin ? (
            <div className="mt-4 border-t border-line pt-3">
              <Button variant="danger" onClick={() => { if (confirm("Write off this loan? This is recorded permanently in the audit trail.")) onAction(() => writeOff.mutateAsync({ p_loan: loan.id })); }}>Write off loan</Button>
            </div>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
