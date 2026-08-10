import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, ALL_ROLES, titleCase } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Field, Input, Select, Textarea, Table, Td, Badge, Empty, Loading, Tabs, Button, ErrorText } from "@/components/negolinks/ui";
import { Plus, Sparkles, Database, Settings2, ToggleLeft } from "lucide-react";

export default function SettingsPage() {
  const { isAdmin } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Organization");
  if (!isAdmin) return <Empty title="Administrators only" hint="Organization settings are managed by Super Admin, Organization Owner, or Managing Director." />;
  return (
    <div className="space-y-4">
      <PageTitle title="Settings" sub="Organization, branding, branches, users, and enterprise administration" />

      {/* Enterprise quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
        {[
          { icon: Sparkles, label: "AI Platform", desc: "Provider, models, usage", to: "/settings/ai" },
          { icon: Database, label: "Demo Data",   desc: "Load/delete demo scenarios", to: "/settings/demo" },
          { icon: ToggleLeft, label: "System Admin", desc: "Feature flags, jobs, health", to: "/settings/system" },
          { icon: Settings2, label: "API & Webhooks", desc: "API keys and webhooks", to: "/settings/system" },
        ].map(({ icon: Icon, label, desc, to }) => (
          <button key={label} onClick={() => navigate(to)}
            className="p-3 rounded-xl text-left transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-glow)]"
            style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)" }}>
            <Icon size={18} className="mb-2" style={{ color: "var(--accent-primary)" }} />
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-[var(--text-muted)]">{desc}</p>
          </button>
        ))}
      </div>

      <Tabs tabs={["Organization", "Branding & theme", "Branches", "Users & roles"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Organization"    ? <OrgForm fields={ORG_FIELDS} /> : null}
        {tab === "Branding & theme"? <OrgForm fields={BRAND_FIELDS} /> : null}
        {tab === "Branches"        ? <Branches /> : null}
        {tab === "Users & roles"   ? <UsersRoles /> : null}
      </div>
    </div>
  );
}

type F = { key: string; label: string; kind?: "text" | "textarea" | "color" | "select"; options?: string[]; hint?: string };

const ORG_FIELDS: F[] = [
  { key: "organization_name",    label: "Organization name" },
  { key: "application_name",     label: "Application name" },
  { key: "registration_details", label: "Registration details", kind: "textarea" },
  { key: "address",              label: "Address", kind: "textarea" },
  { key: "phone_numbers",        label: "Phone numbers" },
  { key: "email",                label: "Email" },
  { key: "website",              label: "Website" },
  { key: "currency_code",        label: "Currency code", hint: "e.g. NGN, KES, GHS, USD" },
  { key: "currency_symbol",      label: "Currency symbol" },
  { key: "time_zone",            label: "Time zone", hint: "e.g. Africa/Lagos" },
  { key: "date_format",          label: "Date format", kind: "select", options: ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] },
  { key: "language",             label: "Language", kind: "select", options: ["en", "fr", "sw", "ha", "yo", "ig"] },
  { key: "ai_assistant_name",    label: "AI assistant name", hint: "What users see — never the actual provider name" },
];

const BRAND_FIELDS: F[] = [
  { key: "logo_url",       label: "Logo URL", hint: "Upload to Supabase Storage → copy public URL" },
  { key: "favicon_url",    label: "Favicon URL" },
  { key: "theme_primary",  label: "Primary accent colour", kind: "color" },
  { key: "theme_accent",   label: "Gold / governance accent", kind: "color" },
  { key: "login_tagline",  label: "Login page tagline", kind: "textarea" },
  { key: "letterhead_url", label: "Letterhead image URL" },
  { key: "stamp_url",      label: "Digital stamp URL" },
  { key: "signature_url",  label: "Digital signature URL" },
];

function OrgForm({ fields }: { fields: F[] }) {
  type Row = Record<string, string | null>;
  const { settings, refreshSettings } = useApp();
  const [form, setForm] = useState<Row>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setForm(Object.fromEntries(fields.map((f) => [f.key, (settings as unknown as Row)[f.key] ?? ""]))); }, [settings, fields]);

  async function save(e: FormEvent) {
    e.preventDefault(); setError(null); setSaved(false);
    const vals = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
    const { error: err } = await supabase.from("org_settings").update({ ...vals, updated_at: new Date().toISOString() }).eq("id", 1);
    if (err) { setError(err.message); return; }
    refreshSettings(); setSaved(true);
  }

  return (
    <Card>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            {f.kind === "textarea" ? (
              <Textarea rows={2} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            ) : f.kind === "color" ? (
              <div className="flex gap-2">
                <input type="color" value={form[f.key] || "#16A34A"} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]" />
                <Input value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ) : f.kind === "select" ? (
              <Select value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : (
              <Input value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
        <div className="sm:col-span-2 space-y-2">
          <ErrorText error={error} />
          {saved ? <p className="text-xs text-[var(--success)]">✓ Saved. Branding applies immediately across the app.</p> : null}
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </Card>
  );
}

function Branches() {
  type Row = Record<string, string | boolean | null>;
  const { data: branches, isLoading } = { data: null as Row[] | null, isLoading: false };
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>({ name: "", code: "", state: "", phone: "" });
  const loading = isLoading;

  useEffect(() => {
    supabase.from("branches").select("*").order("name").then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from("branches").insert(form).select().single();
    if (data) { setRows((r) => [...r, data as Row]); setForm({ name: "", code: "", state: "", phone: "" }); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("branches").update({ active }).eq("id", id);
    setRows((r) => r.map((x) => x.id === id ? { ...x, active } : x));
  };

  if (loading) return <Loading />;
  return (
    <Card title="Branches" action={<Badge tone="accent">{rows.length} total</Badge>}>
      <form className="mb-4 grid sm:grid-cols-5 gap-3" onSubmit={add}>
        <Input required placeholder="Branch name" value={String(form.name ?? "")} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input required placeholder="Code" value={String(form.code ?? "")} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input placeholder="State" value={String(form.state ?? "")} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <Input placeholder="Phone" value={String(form.phone ?? "")} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button type="submit"><Plus size={14} /> Add</Button>
      </form>
      <Table headers={["Branch", "Code", "State", "Phone", "Status", ""]}>
        {rows.map((b) => (
          <tr key={String(b.id)}>
            <Td className="font-semibold">{String(b.name)} {b.is_head_office ? <Badge tone="gold">HQ</Badge> : null}</Td>
            <Td mono>{String(b.code)}</Td>
            <Td>{String(b.state ?? "—")}</Td>
            <Td>{String(b.phone ?? "—")}</Td>
            <Td><Badge tone={b.active ? "success" : "neutral"}>{b.active ? "Active" : "Closed"}</Badge></Td>
            <Td><Button variant="ghost" size="sm" onClick={() => toggle(String(b.id), !b.active)}>{b.active ? "Close" : "Reopen"}</Button></Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function UsersRoles() {
  const [profiles, setProfiles] = useState<Array<{id:string;full_name:string;role:string;branch_id:string|null;active:boolean}>>([]);
  const [branches, setBranches] = useState<Array<{id:string;name:string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("branches").select("id,name").order("name"),
    ]).then(([p, b]) => {
      setProfiles((p.data ?? []) as typeof profiles);
      setBranches((b.data ?? []) as typeof branches);
      setLoading(false);
    });
  }, []);

  const update = async (id: string, vals: Record<string, unknown>) => {
    await supabase.from("profiles").update(vals).eq("id", id);
    setProfiles((pr) => pr.map((p) => p.id === id ? { ...p, ...vals } : p));
  };

  if (loading) return <Loading />;
  return (
    <Card title="Users & roles" action={<Badge tone="accent">{profiles.length} users</Badge>}>
      <p className="text-xs text-[var(--text-muted)] mb-4">First account = Super Admin. Assign roles and branches to incoming staff here.</p>
      <Table headers={["User", "Role", "Branch", "Status"]}>
        {profiles.map((p) => (
          <tr key={p.id}>
            <Td className="font-semibold">{p.full_name}</Td>
            <Td>
              <Select value={p.role} onChange={(e) => update(p.id, { role: e.target.value })} className="max-w-[200px]">
                {ALL_ROLES.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
              </Select>
            </Td>
            <Td>
              <Select value={p.branch_id ?? ""} onChange={(e) => update(p.id, { branch_id: e.target.value || null })} className="max-w-[180px]">
                <option value="">— No branch —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Td>
            <Td>
              <Button variant="ghost" size="sm" onClick={() => update(p.id, { active: !p.active })}>
                <Badge tone={p.active ? "success" : "danger"}>{p.active ? "Active" : "Disabled"}</Badge>
              </Button>
            </Td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}
