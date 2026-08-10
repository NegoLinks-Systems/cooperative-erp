// @ts-nocheck
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, downloadCsv, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { FileDown, Printer } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

const REPORTS: { key: string; title: string; desc: string; table: string; select?: string }[] = [
  { key: "members", title: "Member register", desc: "Full membership list with status, KYC and branch.", table: "members" },
  { key: "savings", title: "Savings balances", desc: "Balance per account across all products.", table: "savings_balances" },
  { key: "savings_txn", title: "Savings transactions", desc: "Every deposit, withdrawal, charge and interest posting.", table: "savings_transactions" },
  { key: "loans", title: "Loan portfolio", desc: "All loans with payable, paid and outstanding positions.", table: "loan_positions" },
  { key: "repayments", title: "Loan repayments", desc: "Repayment cashbook.", table: "loan_repayments" },
  { key: "trial_balance", title: "Trial balance", desc: "Posted debits and credits per GL account.", table: "trial_balance" },
  { key: "shares", title: "Share register", desc: "Certificates issued per member.", table: "share_purchases" },
  { key: "dividends", title: "Dividend payouts", desc: "Distribution schedule per declaration.", table: "dividend_payouts" },
  { key: "investments", title: "Investment portfolio", desc: "Placements with rates and maturities.", table: "investments" },
  { key: "assets", title: "Asset register", desc: "Assets with straight-line depreciation.", table: "asset_depreciation" },
  { key: "meetings", title: "Meetings register", desc: "Board, AGM and committee meetings with status.", table: "meetings" },
  { key: "resolutions", title: "Resolutions register", desc: "Every resolution with voting outcome.", table: "resolutions" },
  { key: "audit", title: "Audit trail", desc: "Complete action-by-action audit log.", table: "audit_logs" },
];

export default function Reports() {
  const { isStaff } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();

  async function exportReport(r: (typeof REPORTS)[number]) {
    setBusy(r.key);
    try {
      const { data, error } = await supabase.from(r.table).select(r.select ?? "*").limit(10000);
      if (error) throw new Error(error.message);
      if (!data?.length) { alert("No rows to export yet."); return; }
      downloadCsv(`${r.key}-${new Date().toISOString().slice(0, 10)}.csv`, data as Row[]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
      qc.invalidateQueries();
    }
  }

  if (!isStaff) return <Empty title="Staff area" hint="Reports are available to staff roles." />;

  return (
    <div>
      <PageTitle title="Reports" sub="Export operational, financial and governance registers (CSV opens in Excel); print any statement view for PDF" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.key}>
            <h3 className="display font-semibold">{r.title}</h3>
            <p className="mt-1 min-h-10 text-sm text-ink-soft">{r.desc}</p>
            <Button variant="ghost" className="mt-3" disabled={busy === r.key} onClick={() => exportReport(r)}>
              <FileDown size={15} /> {busy === r.key ? "Preparing…" : "Export CSV / Excel"}
            </Button>
          </Card>
        ))}
        <Card>
          <h3 className="display font-semibold">Financial statements (PDF)</h3>
          <p className="mt-1 min-h-10 text-sm text-ink-soft">Open Finance → Trial Balance, Profit &amp; Loss or Balance Sheet and use Print — your browser saves a branded PDF.</p>
          <Button variant="ghost" className="mt-3" onClick={() => window.print()}><Printer size={15} /> Print this page</Button>
        </Card>
      </div>
    </div>
  );
}
