import { useState, useEffect } from "react";
import { Zap, Trash2, RefreshCw, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Button, Field, Select, Empty, ErrorText } from "@/components/negolinks/ui";

const SCENARIOS = [
  { key: "small",        label: "Small Cooperative",        members: 12, desc: "12 members, light transaction history — quick demos" },
  { key: "medium",       label: "Medium Cooperative",       members: 40, desc: "40 members with savings and employees — standard demo" },
  { key: "large",        label: "Large Cooperative",        members: 90, desc: "90 members, full transaction history — full showcase" },
  { key: "multi_branch", label: "Multi-Branch Cooperative", members: 60, desc: "60 members spread across multiple branches" },
  { key: "heavy",        label: "Heavy Transactions",       members: 50, desc: "50 members with dense savings transaction volume" },
];

const FIRST = ["Adaeze","Emeka","Ngozi","Chukwuemeka","Amaka","Ifeanyi","Chidinma","Obiora","Blessing","Uchenna","Kelechi","Nkiru","Chinedu","Ijeoma","Tochukwu","Adanna","Nnamdi","Chiamaka","Ekene","Onyeka"];
const LAST  = ["Okonkwo","Nwosu","Eze","Okeke","Obi","Chukwu","Nze","Anozie","Ogbu","Agu","Madu","Iheanacho","Nwachukwu","Onyeji","Umeh"];
const JOBS  = ["Teacher","Trader","Farmer","Civil Servant","Nurse","Engineer","Tailor","Driver","Mechanic","Accountant"];
const POSITIONS = ["Branch Manager","Teller","Loan Officer","Accountant","IT Officer","HR Officer","Field Officer","Cashier"];

async function generateDemoData(scenario: string, onPhase: (p: string) => void): Promise<void> {
  const count = SCENARIOS.find((s) => s.key === scenario)?.members ?? 40;

  // 1. Need a branch — required FK on members
  onPhase("Checking branches…");
  const { data: branches } = await supabase.from("branches").select("id").eq("active", true).limit(5);
  if (!branches?.length) throw new Error("No branches found. Create at least one branch in Settings → Branches first.");
  const branchIds = branches.map((b) => b.id as string);
  const pickBranch = (i: number): string =>
    scenario === "multi_branch" ? branchIds[i % branchIds.length]! : branchIds[0]!;

  // 2. Members — real column names: kyc (not kyc_status), category (not membership_type)
  onPhase(`Creating ${count} members…`);
  const stamp = Date.now().toString().slice(-6);
  const members = Array.from({ length: count }, (_, i) => ({
    member_number: `DEMO-${stamp}-${String(i + 1).padStart(4, "0")}`,
    branch_id: pickBranch(i),
    full_name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    gender: i % 2 === 0 ? "Male" : "Female",
    phone: `080${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
    email: `demo${stamp}.${i + 1}@example.com`,
    address: `${i + 1} Demo Street, Abuja`,
    occupation: JOBS[i % JOBS.length]!,
    category: i % 4 === 0 ? "Associate" : "Regular",
    status: (i % 9 === 0 ? "dormant" : i % 13 === 0 ? "pending" : "active") as string,
    kyc: (i % 6 === 0 ? "submitted" : "verified") as string,
    is_demo: true,
  }));

  const { data: memberRows, error: mErr } = await supabase.from("members").insert(members).select("id,branch_id");
  if (mErr) throw new Error(`Members: ${mErr.message}`);

  // 3. Savings product — create one if none exists
  onPhase("Setting up savings accounts…");
  let { data: products } = await supabase.from("savings_products").select("id").eq("active", true).limit(1);
  if (!products?.length) {
    const { data: newProduct, error: pErr } = await supabase.from("savings_products")
      .insert({ name: "Regular Savings", frequency: "monthly", interest_rate: 4.5, minimum_balance: 1000 })
      .select("id").single();
    if (pErr) throw new Error(`Savings product: ${pErr.message}`);
    products = newProduct ? [newProduct] : [];
  }
  const productId = products[0]?.id as string;

  // 4. Savings accounts — branch_id required, NO balance column (it's a view)
  const accounts = (memberRows ?? []).map((m, i) => ({
    account_number: `SAV-${stamp}-${String(i + 1).padStart(4, "0")}`,
    member_id: m.id as string,
    product_id: productId,
    branch_id: m.branch_id as string,
    status: "active",
  }));
  const { data: accountRows, error: aErr } = await supabase.from("savings_accounts").insert(accounts).select("id");
  if (aErr) throw new Error(`Savings accounts: ${aErr.message}`);

  // 5. Savings transactions — this is what creates the balances
  onPhase("Posting savings transactions…");
  const txnsPerAccount = scenario === "heavy" ? 8 : scenario === "large" ? 5 : 3;
  const transactions: Array<Record<string, unknown>> = [];
  (accountRows ?? []).forEach((acc) => {
    for (let t = 0; t < txnsPerAccount; t++) {
      const isWithdrawal = t > 0 && t % 4 === 0;
      transactions.push({
        account_id: acc.id as string,
        direction: isWithdrawal ? "withdrawal" : "deposit",
        amount: isWithdrawal
          ? Math.round((Math.random() * 20000 + 5000) / 100) * 100
          : Math.round((Math.random() * 80000 + 15000) / 100) * 100,
        method: "cash",
        narration: isWithdrawal ? "Demo withdrawal" : "Demo monthly contribution",
      });
    }
  });
  // Insert in batches of 500 to stay within limits
  for (let i = 0; i < transactions.length; i += 500) {
    const { error: tErr } = await supabase.from("savings_transactions").insert(transactions.slice(i, i + 500));
    if (tErr) throw new Error(`Transactions: ${tErr.message}`);
  }

  // 6. Employees
  onPhase("Creating employees…");
  const employees = Array.from({ length: Math.min(Math.ceil(count / 5), 10) }, (_, i) => ({
    staff_number: `EMP-${stamp}-${String(i + 1).padStart(3, "0")}`,
    full_name: `${FIRST[(i + 5) % FIRST.length]} ${LAST[(i + 3) % LAST.length]}`,
    position: POSITIONS[i % POSITIONS.length]!,
    branch_id: pickBranch(i),
    phone: `081${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
    email: `staff${stamp}.${i + 1}@example.com`,
    salary: Math.round((Math.random() * 180000 + 90000) / 1000) * 1000,
    active: true,
    is_demo: true,
  }));
  const { error: eErr } = await supabase.from("employees").insert(employees);
  if (eErr) throw new Error(`Employees: ${eErr.message}`);

  // 7. Notifications
  onPhase("Generating notifications…");
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("notifications").insert([
      { user_id: user.id, title: "Demo data loaded",        body: `${count} members with savings history created`, type: "success", module: "system" },
      { user_id: user.id, title: "Savings milestone",       body: "Total cooperative savings updated",             type: "info",    module: "savings" },
      { user_id: user.id, title: "New members registered",  body: `${count} members completed onboarding`,          type: "info",    module: "members" },
      { user_id: user.id, title: "KYC review pending",      body: "Some members have submitted KYC awaiting review", type: "warning", module: "members" },
    ]);
  }

  // 8. Mark demo active — correct audit_logs columns: action, entity, entity_id, detail
  onPhase("Finalising…");
  await supabase.from("demo_data_control")
    .update({ is_active: true, scenario, loaded_at: new Date().toISOString(), loaded_by: user?.id ?? null })
    .eq("id", 1);
  await supabase.from("audit_logs").insert({
    action: "demo_load", entity: "system", entity_id: scenario,
    detail: { scenario, members: count, transactions: transactions.length },
  });
}

async function deleteDemoData(onPhase: (p: string) => void): Promise<void> {
  onPhase("Finding demo records…");
  const { data: demoMembers } = await supabase.from("members").select("id").eq("is_demo", true);
  const memberIds = (demoMembers ?? []).map((m) => m.id as string);

  if (memberIds.length) {
    onPhase("Removing savings transactions…");
    const { data: demoAccounts } = await supabase.from("savings_accounts").select("id").in("member_id", memberIds);
    const accountIds = (demoAccounts ?? []).map((a) => a.id as string);
    if (accountIds.length) {
      for (let i = 0; i < accountIds.length; i += 200) {
        await supabase.from("savings_transactions").delete().in("account_id", accountIds.slice(i, i + 200));
      }
      onPhase("Removing savings accounts…");
      for (let i = 0; i < accountIds.length; i += 200) {
        await supabase.from("savings_accounts").delete().in("id", accountIds.slice(i, i + 200));
      }
    }
    onPhase("Removing members…");
    await supabase.from("members").delete().eq("is_demo", true);
  }

  onPhase("Removing employees…");
  await supabase.from("employees").delete().eq("is_demo", true);

  onPhase("Clearing demo notifications…");
  await supabase.from("notifications").delete().eq("module", "system").eq("title", "Demo data loaded");

  await supabase.from("demo_data_control").update({ is_active: false, loaded_at: null }).eq("id", 1);
  await supabase.from("audit_logs").insert({ action: "demo_delete", entity: "system", entity_id: "demo", detail: {} });
}

export default function DemoData() {
  const { isAdmin, demoMode } = useApp();
  const [scenario, setScenario] = useState("medium");
  const [busy, setBusy]         = useState(false);
  const [phase, setPhase]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("demo_data_control").select("*").eq("id", 1).single()
      .then(({ data }) => { if (data) setLoadedAt(data.loaded_at as string | null); });
  }, []);

  if (!isAdmin) return <Empty title="Administrators only" hint="Demo Data Manager is restricted to Super Admin." />;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); window.location.reload(); }
    catch (err) { setError(err instanceof Error ? err.message : "Operation failed"); }
    finally { setBusy(false); setPhase(""); }
  };

  const load   = () => run(() => generateDemoData(scenario, setPhase));
  const remove = () => { if (confirm("Delete all demo data? Real records are untouched.")) run(() => deleteDemoData(setPhase)); };
  const reload = () => run(async () => { await deleteDemoData(setPhase); await generateDemoData(scenario, setPhase); });

  const active = SCENARIOS.find((s) => s.key === scenario)!;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageTitle title="Demo Data Manager" sub="Load realistic sample data for demonstrations, training and evaluation" />

      {demoMode ? (
        <div className="demo-banner rounded-lg">
          <Zap size={14} />
          DEMO MODE ACTIVE{loadedAt ? ` — loaded ${new Date(loadedAt).toLocaleDateString()}` : ""}
        </div>
      ) : null}

      <Card title="Demo Scenario" accent>
        <div className="space-y-4">
          <Field label="Select scenario">
            <Select value={scenario} onChange={(e) => setScenario(e.target.value)} disabled={busy}>
              {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>

          <div className="px-3.5 py-3 rounded-lg text-[13px] text-[var(--text-secondary)]"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            {active.desc}
          </div>

          <ErrorText error={error} />

          {busy ? (
            <div className="flex items-center gap-2.5 text-[13px] text-[var(--accent-light)] py-2">
              <RefreshCw size={14} className="animate-spin" />
              {phase || "Working…"}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {!demoMode
                ? <Button onClick={load}><Database size={14} /> Load Demo Data</Button>
                : <>
                    <Button onClick={reload}><RefreshCw size={14} /> Reload Demo Data</Button>
                    <Button variant="danger" onClick={remove}><Trash2 size={14} /> Delete Demo Data</Button>
                  </>}
            </div>
          )}
        </div>
      </Card>

      <Card title="What gets created">
        <div className="grid sm:grid-cols-2 gap-2.5 text-[13px]">
          {[
            `${active.members} members with KYC status`,
            "Savings accounts per member",
            "Savings deposits & withdrawals",
            "Staff records with positions",
            "In-app notifications",
            "Audit trail entries",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[var(--text-secondary)]">
              <CheckCircle2 size={14} style={{ color: "var(--success)" }} className="shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} style={{ color: "var(--warning)" }} className="shrink-0 mt-0.5" />
          <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <p className="font-semibold text-[var(--text-primary)] mb-1">Before loading</p>
            Run migration <code className="text-[var(--accent-light)]">005_enterprise.sql</code>, then in Supabase SQL Editor run:
            <code className="block mt-2 text-[12px] text-[var(--accent-light)]">
              ALTER TABLE members ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;<br/>
              ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
