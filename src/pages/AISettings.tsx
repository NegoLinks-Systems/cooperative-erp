import { useState, useEffect, type FormEvent } from "react";
import { Sparkles, Key, BarChart3, MessageSquare, ToggleLeft, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Field, Input, Select, Button, Tabs, Table, Td, Badge, Loading, Empty } from "@/components/negolinks/ui";
import { PROVIDER_REGISTRY, type AIProviderName } from "@/lib/ai/provider";

export default function AISettings() {
  const { isAdmin, settings } = useApp();
  const [tab, setTab] = useState("Provider");

  if (!isAdmin) return <Empty title="Administrators only" hint="AI Platform settings are restricted to Super Admin, Org Owner, and Managing Director." />;

  return (
    <div className="space-y-4">
      <PageTitle
        title="AI Platform"
        sub={`NegoLinks Intelligence Engine · Branding: ${settings.ai_assistant_name}`}
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--accent-glow)", border: "1px solid var(--accent-border)" }}>
            <Sparkles size={12} style={{ color: "var(--gold)" }} />
            <span className="text-[var(--accent-light)] font-semibold">NegoLinks Intelligence Engine</span>
          </div>
        }
      />
      <Tabs tabs={["Provider", "Module Controls", "Prompt Templates", "Usage Logs"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Provider"          && <ProviderConfig />}
        {tab === "Module Controls"   && <ModuleControls />}
        {tab === "Prompt Templates"  && <PromptTemplates />}
        {tab === "Usage Logs"        && <UsageLogs />}
      </div>
    </div>
  );
}

function ProviderConfig() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("ai_platform_config").select("*").eq("id", 1).single()
      .then(({ data }) => { if (data) setConfig(data as Record<string, unknown>); setLoading(false); });
  }, []);

  const selectedProvider = PROVIDER_REGISTRY.find((p) => p.name === config.provider) ?? PROVIDER_REGISTRY[0]!;

  async function save(e: FormEvent) {
    e.preventDefault(); setSaved(false);
    const { error } = await supabase.from("ai_platform_config").update({ ...config, updated_at: new Date().toISOString() }).eq("id", 1);
    if (!error) setSaved(true);
  }

  if (loading) return <Loading />;

  return (
    <Card title="AI Provider Configuration" accent>
      <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
        🔒 API keys are stored in Supabase secrets and processed server-side only. Keys are never sent to the browser. Set keys via: <code>supabase secrets set AI_API_KEY=your_key</code>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="AI Provider" hint="Groq Cloud is the default — fastest inference for most tasks">
          <Select value={String(config.provider ?? "groq")} onChange={(e) => {
            const p = PROVIDER_REGISTRY.find((x) => x.name === e.target.value);
            setConfig({ ...config, provider: e.target.value, base_url: p?.baseUrl ?? "", model: p?.defaultModel ?? "" });
          }}>
            {PROVIDER_REGISTRY.map((p) => <option key={p.name} value={p.name}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="API Base URL">
          <Input value={String(config.base_url ?? selectedProvider.baseUrl)} onChange={(e) => setConfig({ ...config, base_url: e.target.value })} />
        </Field>
        <Field label="Model" hint="Set AI_MODEL secret to override; leave blank to use default">
          <Input value={String(config.model ?? selectedProvider.defaultModel)} onChange={(e) => setConfig({ ...config, model: e.target.value })} placeholder={selectedProvider.defaultModel} />
        </Field>
        <Field label="AI Branding Name" hint="What end users see — never the provider name">
          <Input value={String(config.ai_brand_name ?? "AI Assistance")} onChange={(e) => setConfig({ ...config, ai_brand_name: e.target.value })} />
        </Field>
        <Field label="Temperature (0–2)">
          <Input type="number" min="0" max="2" step="0.1" value={String(config.temperature ?? 0.7)} onChange={(e) => setConfig({ ...config, temperature: e.target.value })} />
        </Field>
        <Field label="Max Tokens">
          <Input type="number" min="256" max="32768" value={String(config.max_tokens ?? 4096)} onChange={(e) => setConfig({ ...config, max_tokens: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit"><Key size={14} /> Save Configuration</Button>
          {saved ? <span className="ml-3 text-xs text-[var(--success)]">✓ Saved. Deploy function for API key changes.</span> : null}
        </div>
      </form>

      <div className="mt-6 p-4 rounded-lg space-y-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Deployment Commands</h4>
        <code className="block text-xs text-[var(--accent-light)] mt-1">supabase secrets set AI_PROVIDER={String(config.provider ?? "groq")}</code>
        <code className="block text-xs text-[var(--accent-light)]">supabase secrets set AI_API_KEY=your_api_key_here</code>
        <code className="block text-xs text-[var(--accent-light)]">supabase secrets set AI_MODEL={String(config.model ?? selectedProvider.defaultModel)}</code>
        <code className="block text-xs text-[var(--accent-light)]">supabase functions deploy ai-assistant</code>
      </div>
    </Card>
  );
}

function ModuleControls() {
  const [config, setConfig] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("ai_platform_config").select("ai_dashboard,ai_members,ai_loans,ai_savings,ai_finance,ai_governance,ai_hr,ai_comms").eq("id", 1).single()
      .then(({ data }) => { if (data) setConfig(data as Record<string, boolean>); setLoading(false); });
  }, []);

  const modules = [
    { key: "ai_dashboard",  label: "Dashboard AI Insights",    desc: "Executive summary and analytics" },
    { key: "ai_members",    label: "Members AI",               desc: "Member analytics and scoring" },
    { key: "ai_loans",      label: "Loans AI",                 desc: "Credit risk analysis" },
    { key: "ai_savings",    label: "Savings AI",               desc: "Savings trend forecasting" },
    { key: "ai_finance",    label: "Finance AI",               desc: "Financial statement analysis" },
    { key: "ai_governance", label: "Governance AI",            desc: "Minutes drafting and summaries" },
    { key: "ai_hr",         label: "HR AI",                    desc: "Performance insights" },
    { key: "ai_comms",      label: "Communications AI",        desc: "Message drafting assistance" },
  ];

  const toggle = async (key: string, val: boolean) => {
    setConfig((c) => ({ ...c, [key]: val }));
    await supabase.from("ai_platform_config").update({ [key]: val }).eq("id", 1);
  };

  if (loading) return <Loading />;

  return (
    <Card title="AI Module Controls" accent>
      <p className="text-sm text-[var(--text-muted)] mb-4">Enable or disable AI features per module without code changes.</p>
      <div className="space-y-3">
        {modules.map((m) => (
          <div key={m.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <div>
              <p className="text-sm font-semibold text-white">{m.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{m.desc}</p>
            </div>
            <button onClick={() => toggle(m.key, !config[m.key])}
              className={`relative w-11 h-6 rounded-full transition-colors ${config[m.key] ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-border)]"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config[m.key] ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PromptTemplates() {
  const [templates, setTemplates] = useState<Array<{id:string;module:string;name:string;prompt:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ module: "dashboard", name: "", prompt: "" });

  useEffect(() => {
    supabase.from("ai_prompt_templates").select("*").order("module").then(({ data }) => {
      setTemplates((data ?? []) as typeof templates); setLoading(false);
    });
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from("ai_prompt_templates").insert(form).select().single();
    if (data) { setTemplates((t) => [...t, data as typeof templates[0]]); setForm({ module: "dashboard", name: "", prompt: "" }); }
  };

  if (loading) return <Loading />;

  return (
    <Card title="AI Prompt Templates" accent>
      <form onSubmit={add} className="grid sm:grid-cols-3 gap-3 mb-6">
        <Field label="Module">
          <Select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
            {["dashboard","members","loans","savings","finance","governance","hr","comms"].map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </Field>
        <Field label="Template name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="sm:col-span-3">
          <Field label="Prompt">
            <textarea required rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} className="nl-input resize-none" placeholder="Enter the prompt template…" />
          </Field>
        </div>
        <Button type="submit"><MessageSquare size={14} /> Add Template</Button>
      </form>
      {templates.length === 0 ? <Empty title="No templates yet" /> : (
        <Table headers={["Module", "Name", "Prompt"]}>
          {templates.map((t) => (
            <tr key={t.id}>
              <Td><Badge tone="accent">{t.module}</Badge></Td>
              <Td className="font-semibold">{t.name}</Td>
              <Td className="text-[var(--text-muted)] max-w-xs truncate text-xs">{t.prompt}</Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function UsageLogs() {
  const [logs, setLogs] = useState<Array<{id:string;module:string;model_used:string;response_chars:number;created_at:string}>>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    supabase.from("ai_usage_logs").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { setLogs((data ?? []) as typeof logs); setLoading(false); });
  };
  useEffect(load, []);

  if (loading) return <Loading />;

  const total = logs.reduce((s, l) => s + (l.response_chars ?? 0), 0);

  return (
    <Card title="AI Usage Logs" action={<Button variant="ghost" size="sm" onClick={load}><RefreshCw size={12} /> Refresh</Button>}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[["Total Requests", logs.length.toString()], ["Response Volume", `${(total/1000).toFixed(1)}K chars`], ["Modules Used", new Set(logs.map(l => l.module)).size.toString()]].map(([label, val]) => (
          <div key={label} className="p-3 rounded-lg text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            <p className="text-lg font-bold gradient-text-accent">{val}</p>
            <p className="text-xs text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>
      {logs.length === 0 ? <Empty title="No AI usage yet" hint="Usage is logged each time AI Assistance is called." /> : (
        <Table headers={["When", "Module", "Model", "Response Size"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <Td className="text-xs text-[var(--text-muted)]">{new Date(l.created_at).toLocaleString()}</Td>
              <Td><Badge tone="accent">{l.module}</Badge></Td>
              <Td className="text-xs text-[var(--text-secondary)]">{l.model_used ?? "—"}</Td>
              <Td mono right>{l.response_chars?.toLocaleString()} ch</Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
