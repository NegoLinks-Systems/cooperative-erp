import { useState, useEffect } from "react";
import { Zap, Trash2, RefreshCw, Database, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Button, Field, Select, Empty, Loading } from "@/components/negolinks/ui";

const SCENARIOS = [
  { key: "small",       label: "Small Business",              desc: "~50 records per module — ideal for demos" },
  { key: "medium",      label: "Medium Business",             desc: "~200 records per module — standard demo" },
  { key: "large",       label: "Large Enterprise",            desc: "~1000+ records — full-scale showcase" },
  { key: "multi_branch",label: "Multi-Branch Enterprise",     desc: "Data spread across 5+ branches" },
  { key: "heavy",       label: "Heavy Daily Transactions",    desc: "High-volume transactional data with detailed logs" },
];

// Demo data generators
async function generateDemoData(scenario: string) {
  const count = { small: 5, medium: 15, large: 40, multi_branch: 20, heavy: 50 }[scenario] ?? 10;
  const prefix = "DEMO_";

  // Demo members
  const members = Array.from({ length: count }, (_, i) => ({
    full_name: `${prefix}${["Adaeze", "Emeka", "Ngozi", "Chukwuemeka", "Amaka", "Ifeanyi", "Chidinma", "Obiora", "Blessing", "Uchenna"][i % 10]} ${["Okonkwo", "Nwosu", "Eze", "Okeke", "Obi", "Chukwu", "Nze", "Anozie", "Ogbu", "Agu"][Math.floor(i / 10) % 10]}`,
    member_number: `MBR-DEMO-${String(i + 1).padStart(4, "0")}`,
    status: i % 8 === 0 ? "inactive" : "active",
    kyc_status: i % 5 === 0 ? "pending" : "approved",
    membership_type: i % 3 === 0 ? "associate" : "full",
    phone: `080${String(Math.floor(Math.random() * 90000000 + 10000000))}`,
    email: `demo.member${i + 1}@example.com`,
    occupation: ["Teacher", "Trader", "Farmer", "Civil Servant", "Nurse", "Engineer"][i % 6],
    gender: i % 2 === 0 ? "male" : "female",
    is_demo: true,
  }));

  const { data: memberData, error: mErr } = await supabase.from("members").insert(members).select("id");
  if (mErr) throw new Error(mErr.message);

  // Demo savings products
  const { data: prodData } = await supabase.from("savings_products").select("id").limit(1);
  if (prodData?.length && memberData?.length) {
    const accounts = memberData.slice(0, Math.min(memberData.length, count)).map((m) => ({
      member_id: m.id,
      product_id: prodData[0]!.id,
      account_number: `SAV-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      balance: Math.round(Math.random() * 500000 + 10000),
      status: "active",
      is_demo: true,
    }));
    await supabase.from("savings_accounts").insert(accounts);
  }

  // Demo notifications
  const notifTypes = ["info", "success", "warning"] as const;
  const notifMessages = [
    { title: "Loan Repayment Due", body: "Member DEMO-0001 has a repayment due in 3 days" },
    { title: "New Member Registered", body: "A new member has completed KYC" },
    { title: "Board Meeting Reminder", body: "Quarterly board meeting scheduled for next week" },
    { title: "Savings Milestone", body: "Total cooperative savings crossed ₦10M" },
    { title: "Dividend Processing", body: "Annual dividend distribution is ready for approval" },
  ];

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const notifs = notifMessages.map((n, i) => ({
      user_id: user.id,
      ...n,
      type: notifTypes[i % 3],
      read: false,
    }));
    await supabase.from("notifications").insert(notifs);
  }

  // Demo employees
  const employees = Array.from({ length: Math.min(count, 8) }, (_, i) => ({
    staff_number: `EMP-DEMO-${String(i + 1).padStart(3, "0")}`,
    full_name: `${prefix}Employee ${i + 1}`,
    position: ["Manager", "Teller", "Loan Officer", "Accountant", "IT Officer", "HR Officer", "Security", "Driver"][i % 8],
    salary: Math.round(Math.random() * 200000 + 80000),
    active: true,
    is_demo: true,
  }));
  await supabase.from("employees").insert(employees);

  // Mark demo active
  await supabase.from("demo_data_control").update({
    is_active: true, scenario, loaded_at: new Date().toISOString(),
  }).eq("id", 1);

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "demo_load", entity: "system", detail: { scenario, records: count },
  });
}

async function deleteDemoData() {
  // Delete records marked as demo
  await supabase.from("members").delete().eq("is_demo", true);
  await supabase.from("employees").delete().eq("is_demo", true);
  await supabase.from("notifications").delete().eq("read", false);
  await supabase.from("demo_data_control").update({ is_active: false }).eq("id", 1);
  await supabase.from("audit_logs").insert({
    action: "demo_delete", entity: "system", detail: {},
  });
}

export default function DemoData() {
  const { isAdmin, demoMode } = useApp();
  const [scenario, setScenario] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    supabase.from("demo_data_control").select("*").eq("id", 1).single()
      .then(({ data }) => { if (data) setLoadedAt(data.loaded_at as string | null); });
  }, []);

  if (!isAdmin) return <Empty title="Super Admin only" hint="Demo Data Manager is restricted to Super Admin." />;

  const load = async () => {
    if (!confirm(`Load demo data (${SCENARIOS.find(s => s.key === scenario)?.label})? This will insert realistic sample data across all modules.`)) return;
    setLoading(true);
    setPhase("Generating members…");
    try {
      await generateDemoData(scenario);
      setPhase("Done!");
      setLoadedAt(new Date().toISOString());
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Demo load failed. Ensure the is_demo column exists — run migration 005.");
    } finally {
      setLoading(false); setPhase("");
    }
  };

  const remove = async () => {
    if (!confirm("Delete all demo data? Real business data will remain untouched. This cannot be undone.")) return;
    setLoading(true); setPhase("Removing demo data…");
    try {
      await deleteDemoData();
      setLoadedAt(null);
      window.location.reload();
    } finally {
      setLoading(false); setPhase("");
    }
  };

  const reload = async () => {
    setLoading(true); setPhase("Regenerating…");
    try {
      await deleteDemoData();
      await generateDemoData(scenario);
      setLoadedAt(new Date().toISOString());
      window.location.reload();
    } finally {
      setLoading(false); setPhase("");
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <PageTitle
        title="Demo Data Manager"
        sub="Load realistic sample data for demonstrations, training, and evaluation"
      />

      {demoMode ? (
        <div className="demo-banner rounded-lg">
          <Zap size={14} />
          DEMO MODE ACTIVE — Sample data loaded {loadedAt ? `on ${new Date(loadedAt).toLocaleDateString()}` : ""}
        </div>
      ) : null}

      <Card title="Demo Scenario" accent>
        <div className="space-y-4">
          <Field label="Select scenario">
            <Select value={scenario} onChange={(e) => setScenario(e.target.value)}>
              {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </Field>
          {SCENARIOS.filter((s) => s.key === scenario).map((s) => (
            <div key={s.key} className="p-3 rounded-lg text-sm text-[var(--text-secondary)]" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
              {s.desc}
            </div>
          ))}

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-[var(--accent-light)]">
              <RefreshCw size={14} className="animate-spin" />
              {phase}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {!demoMode ? (
                <Button onClick={load}><Database size={14} /> Load Demo Data</Button>
              ) : (
                <>
                  <Button onClick={reload}><RefreshCw size={14} /> Reload Demo Data</Button>
                  <Button variant="danger" onClick={remove}><Trash2 size={14} /> Delete Demo Data</Button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card title="What gets populated">
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            "Members with KYC records", "Savings accounts & transactions", "Employees & attendance",
            "In-app notifications", "Audit trail entries", "Dashboard with live data",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[var(--text-secondary)]">
              <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
              {item}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Note: Add an <code>is_demo boolean DEFAULT false</code> column to members and employees tables to enable demo data deletion. Run migration 005 first.
        </p>
      </Card>
    </div>
  );
}
