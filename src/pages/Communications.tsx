// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useTable, useInsert, useUpdate, fmtDate, titleCase, type Row } from "@/lib/core";
import { askAI } from "@/lib/ai/client";
import { useApp } from "@/contexts/AppContext";
import { Plus, Sparkles } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Communications() {
  const { settings, isStaff, isAdmin } = useApp();
  const [tab, setTab] = useState("Compose & queue");

  const { data: templates, isLoading } = useTable("message_templates", { order: "name", asc: true });
  const { data: log } = useTable("message_log");
  const { data: integrations } = useTable("integration_settings", { order: "id", asc: true });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });

  const insertTemplate = useInsert("message_templates");
  const insertMessage = useInsert("message_log");
  const updateIntegrations = useUpdate("integration_settings");

  const [showTemplate, setShowTemplate] = useState(false);
  const [tForm, setTForm] = useState<Row>({ name: "", channel: "sms", subject: "", body: "", purpose: "general" });
  const [compose, setCompose] = useState<Row>({ channel: "sms", recipient: "", subject: "", body: "", template: "" });
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const integ = (integrations ?? [])[0];

  if (isLoading) return <Loading />;
  if (!isStaff) return <Empty title="Staff area" hint="Communications are managed by staff." />;

  return (
    <div>
      <PageTitle title="Communications" sub="Email, SMS and WhatsApp — templates, reminders and delivery log" action={
        <Button variant="ghost" onClick={() => setShowTemplate(true)}><Plus size={15} /> Template</Button>
      } />
      <Tabs tabs={["Compose & queue", "Templates", "Delivery log", "Providers"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Compose & queue" ? (
          <Card title="Compose message">
            <form className="space-y-4" onSubmit={(e: FormEvent) => {
              e.preventDefault(); setError(null);
              insertMessage.mutate({
                channel: compose.channel, recipient: compose.recipient,
                subject: compose.subject || null, body: compose.body,
                provider: compose.channel === "email" ? integ?.email_provider : compose.channel === "sms" ? integ?.sms_provider : integ?.whatsapp_provider,
                status: "queued",
              }, {
                onSuccess: () => setCompose({ channel: compose.channel, recipient: "", subject: "", body: "", template: "" }),
                onError: (err) => setError(err.message),
              });
            }}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Channel">
                  <Select value={compose.channel} onChange={(e) => setCompose({ ...compose, channel: e.target.value })}>
                    <option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_app">In-app</option>
                  </Select>
                </Field>
                <Field label="Recipient" hint="Phone number, email address, or member name">
                  <Input required list="member-contacts" value={compose.recipient} onChange={(e) => setCompose({ ...compose, recipient: e.target.value })} />
                  <datalist id="member-contacts">
                    {(members ?? []).map((m) => <option key={m.id} value={compose.channel === "email" ? (m.email ?? m.full_name) : (m.phone ?? m.full_name)}>{m.full_name}</option>)}
                  </datalist>
                </Field>
                <Field label="Start from template">
                  <Select value={compose.template} onChange={(e) => {
                    const t = (templates ?? []).find((x) => x.id === e.target.value);
                    setCompose({ ...compose, template: e.target.value, subject: t?.subject ?? compose.subject, body: t?.body ?? compose.body, channel: t?.channel ?? compose.channel });
                  }}>
                    <option value="">—</option>
                    {(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </Field>
              </div>
              {compose.channel === "email" ? <Field label="Subject"><Input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} /></Field> : null}
              <Field label="Message" hint="Placeholders like {member_name}, {amount} and {due_date} are filled by automated reminder jobs.">
                <Textarea required rows={5} value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" disabled={drafting} onClick={async () => {
                  setDrafting(true); setError(null);
                  try {
                    const text = await askAI(
                      `Draft a short, professional ${compose.channel} message from ${settings.organization_name} to a cooperative member. ` +
                      `Purpose/notes: ${compose.body || "a polite payment reminder"}. Keep placeholders like {member_name} where personal data would go. Return only the message text.`
                    );
                    setCompose({ ...compose, body: text });
                  } catch (err) { setError(err instanceof Error ? err.message : "Draft failed"); }
                  finally { setDrafting(false); }
                }}><Sparkles size={15} /> {drafting ? "Drafting…" : `Draft with ${settings.ai_assistant_name}`}</Button>
                <Button type="submit" disabled={insertMessage.isPending}>Queue message</Button>
              </div>
              <ErrorText error={error} />
              <p className="text-xs text-ink-soft">
                Queued messages are delivered by your configured provider ({titleCase(String(integ?.sms_provider ?? "termii"))} for SMS). Delivery workers read the queue via the API using the service role key — see the setup guide.
              </p>
            </form>
          </Card>
        ) : null}

        {tab === "Templates" ? (
          <Card>
            <Table headers={["Template", "Channel", "Purpose", "Body"]}>
              {(templates ?? []).map((t) => (
                <tr key={t.id} className="border-b border-line">
                  <Td className="font-medium">{t.name}</Td>
                  <Td><Badge>{t.channel.toUpperCase()}</Badge></Td>
                  <Td>{titleCase(t.purpose)}</Td>
                  <Td className="max-w-md truncate text-ink-soft">{t.body}</Td>
                </tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-ink-soft">Automated reminders (savings due, loan repayments, meetings, AGMs, dividends, renewals) use these templates by purpose.</p>
          </Card>
        ) : null}

        {tab === "Delivery log" ? (
          <Card>
            {(log ?? []).length === 0 ? <Empty title="No messages yet" hint="Queued and sent messages appear here with delivery status." /> : (
              <Table headers={["Date", "Channel", "Recipient", "Message", "Provider", "Status"]}>
                {(log ?? []).map((m) => (
                  <tr key={m.id} className="border-b border-line">
                    <Td>{fmtDate(m.created_at, settings.date_format)}</Td>
                    <Td><Badge>{m.channel.toUpperCase()}</Badge></Td>
                    <Td>{m.recipient}</Td>
                    <Td className="max-w-sm truncate">{m.subject ? `${m.subject} — ` : ""}{m.body}</Td>
                    <Td>{m.provider ?? "—"}</Td>
                    <Td><Badge tone={m.status === "sent" ? "good" : m.status === "failed" ? "bad" : "warn"}>{titleCase(m.status)}</Badge></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Providers" ? (
          isAdmin && integ ? (
            <Card title="Provider configuration">
              <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e: FormEvent) => {
                e.preventDefault();
                const f = e.target as HTMLFormElement;
                updateIntegrations.mutate({
                  id: 1, values: {
                    email_provider: (f.elements.namedItem("email") as HTMLSelectElement).value,
                    sms_provider: (f.elements.namedItem("sms") as HTMLSelectElement).value,
                    whatsapp_provider: (f.elements.namedItem("wa") as HTMLSelectElement).value,
                    updated_at: new Date().toISOString(),
                  },
                });
                alert("Provider selection saved. Add API keys as Supabase secrets — never in the browser.");
              }}>
                <Field label="Email provider">
                  <Select name="email" defaultValue={integ.email_provider}>
                    <option value="smtp">SMTP</option><option value="emailjs">EmailJS</option><option value="gmail">Gmail</option><option value="microsoft365">Microsoft 365</option>
                  </Select>
                </Field>
                <Field label="SMS provider">
                  <Select name="sms" defaultValue={integ.sms_provider}>
                    <option value="termii">Termii</option><option value="smartsms">SmartSMSSolutions</option><option value="africastalking">Africa's Talking</option><option value="twilio">Twilio</option>
                  </Select>
                </Field>
                <Field label="WhatsApp provider">
                  <Select name="wa" defaultValue={integ.whatsapp_provider}>
                    <option value="meta_cloud">Meta Cloud API</option><option value="whatsapp_business">WhatsApp Business API</option>
                  </Select>
                </Field>
                <div className="sm:col-span-3">
                  <Button type="submit">Save providers</Button>
                  <p className="mt-2 text-xs text-ink-soft">API credentials belong in Supabase Edge Function secrets (server-side). The delivery worker reads the queue and dispatches via the selected provider.</p>
                </div>
              </form>
            </Card>
          ) : <Empty title="Administrators only" hint="Provider configuration is limited to administrators." />
        ) : null}
      </div>

      <Modal open={showTemplate} onClose={() => setShowTemplate(false)} title="New template">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertTemplate.mutate({ ...tForm, subject: tForm.subject || null }, { onSuccess: () => setShowTemplate(false) });
        }}>
          <Field label="Template name"><Input required value={tForm.name} onChange={(e) => setTForm({ ...tForm, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <Select value={tForm.channel} onChange={(e) => setTForm({ ...tForm, channel: e.target.value })}>
                <option value="sms">SMS</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option><option value="in_app">In-app</option>
              </Select>
            </Field>
            <Field label="Purpose">
              <Select value={tForm.purpose} onChange={(e) => setTForm({ ...tForm, purpose: e.target.value })}>
                <option value="general">General</option><option value="savings_due">Savings due</option><option value="loan_due">Loan repayment</option>
                <option value="meeting">Meeting</option><option value="agm">AGM</option><option value="dividend">Dividend</option><option value="renewal">Membership renewal</option>
              </Select>
            </Field>
          </div>
          {tForm.channel === "email" ? <Field label="Subject"><Input value={tForm.subject} onChange={(e) => setTForm({ ...tForm, subject: e.target.value })} /></Field> : null}
          <Field label="Body" hint="Use {member_name}, {amount}, {due_date}, {date}, {venue}, {year} placeholders.">
            <Textarea required rows={4} value={tForm.body} onChange={(e) => setTForm({ ...tForm, body: e.target.value })} />
          </Field>
          <Button type="submit" disabled={insertTemplate.isPending} className="w-full justify-center">Save template</Button>
        </form>
      </Modal>
    </div>
  );
}
