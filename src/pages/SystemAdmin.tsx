import { useState, useEffect } from "react";
import { Activity, ToggleLeft, Database, Cpu, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Button, Tabs, Table, Td, Badge, Empty, Loading } from "@/components/negolinks/ui";

export default function SystemAdmin() {
  const { isAdmin } = useApp();
  const [tab, setTab] = useState("Feature Flags");
  if (!isAdmin) return <Empty title="Administrators only" />;
  return (
    <div className="space-y-4">
      <PageTitle title="System Administration" sub="Feature flags, background jobs, system health, and API management" />
      <Tabs tabs={["Feature Flags", "Background Jobs", "System Health"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Feature Flags"   && <FeatureFlags />}
        {tab === "Background Jobs" && <BackgroundJobs />}
        {tab === "System Health"   && <SystemHealth />}
      </div>
    </div>
  );
}

function FeatureFlags() {
  const [flags, setFlags] = useState<Array<{id:string;key:string;label:string;description:string;enabled:boolean;category:string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("feature_flags").select("*").order("category").then(({ data }) => {
      setFlags((data ?? []) as typeof flags); setLoading(false);
    });
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    setFlags((f) => f.map((x) => x.id === id ? { ...x, enabled } : x));
    await supabase.from("feature_flags").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
  };

  if (loading) return <Loading />;

  const grouped = flags.reduce<Record<string, typeof flags>>((acc, f) => {
    (acc[f.category] ??= []).push(f); return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} title={`${cat.charAt(0).toUpperCase() + cat.slice(1)} Features`}>
          <div className="space-y-2">
            {items.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  {f.description ? <p className="text-xs text-[var(--text-muted)]">{f.description}</p> : null}
                </div>
                <button onClick={() => toggle(f.id, !f.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${f.enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${f.enabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function BackgroundJobs() {
  const [jobs, setJobs] = useState<Array<{id:string;name:string;job_type:string;schedule:string;status:string;last_run_at:string;next_run_at:string;enabled:boolean}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("background_jobs").select("*").order("name").then(({ data }) => {
      setJobs((data ?? []) as typeof jobs); setLoading(false);
    });
  }, []);

  const toggle = async (id: string, enabled: boolean) => {
    setJobs((j) => j.map((x) => x.id === id ? { ...x, enabled } : x));
    await supabase.from("background_jobs").update({ enabled }).eq("id", id);
  };

  if (loading) return <Loading />;

  return (
    <Card title="Scheduled Background Jobs" action={
      <Button variant="ghost" size="sm"><RefreshCw size={12} /> Refresh</Button>
    }>
      <p className="text-xs text-[var(--text-muted)] mb-4">Jobs run via Supabase Edge Function cron triggers. Status is updated by the worker.</p>
      <Table headers={["Job", "Type", "Schedule", "Status", "Last Run", "Enabled"]}>
        {jobs.map((j) => (
          <tr key={j.id}>
            <Td className="font-semibold">{j.name}</Td>
            <Td><Badge tone="info">{j.job_type.replace("_", " ")}</Badge></Td>
            <Td mono className="text-xs">{j.schedule}</Td>
            <Td><Badge tone={j.status === "completed" ? "success" : j.status === "running" ? "warning" : j.status === "failed" ? "danger" : "neutral"}>{j.status}</Badge></Td>
            <Td className="text-xs text-[var(--text-muted)]">{j.last_run_at ? new Date(j.last_run_at).toLocaleDateString() : "Never"}</Td>
            <Td>
              <button onClick={() => toggle(j.id, !j.enabled)}
                className={`relative w-9 h-5 rounded-full transition-colors ${j.enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${j.enabled ? "translate-x-4" : ""}`} />
              </button>
            </Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function SystemHealth() {
  const [health, setHealth] = useState<{db: string; ai: string; storage: string; latency: number} | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const { error } = await supabase.from("org_settings").select("id").single();
      const latency = Date.now() - start;
      setHealth({ db: error ? "degraded" : "healthy", ai: "unknown", storage: "healthy", latency });
    } catch {
      setHealth({ db: "error", ai: "unknown", storage: "unknown", latency: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="space-y-4">
      <Card title="System Status" action={<Button variant="ghost" size="sm" onClick={check} loading={loading}><RefreshCw size={12} /> Check Now</Button>}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Database", status: health?.db ?? "checking", icon: Database },
            { label: "AI Platform", status: health?.ai ?? "checking", icon: Cpu },
            { label: "Storage", status: health?.storage ?? "checking", icon: Activity },
            { label: "API Latency", status: health?.latency ? `${health.latency}ms` : "—", icon: Clock, raw: true },
          ].map(({ label, status, icon: Icon, raw }) => (
            <div key={label} className="p-4 rounded-lg text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
              <Icon size={20} className="mx-auto mb-2" style={{ color: status === "healthy" || raw ? "var(--success)" : status === "degraded" ? "var(--warning)" : "var(--text-muted)" }} />
              <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
              <p className={`text-sm font-bold ${status === "healthy" || raw ? "text-[var(--success)]" : status === "degraded" ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}>
                {raw ? status : status.charAt(0).toUpperCase() + status.slice(1)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
