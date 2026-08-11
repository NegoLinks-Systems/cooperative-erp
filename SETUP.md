# NegoLinks Cooperative & Microfinance ERP — Setup Guide
## Version 2.0 · Enterprise Edition

**Deployment URL:** https://cooperative.negolinks.com  
**Stack:** React 19 · TypeScript · Vite · Tailwind v4 · Supabase · Vercel  
**Theme:** NegoLinks Dark Enterprise · Community Green accent

---

## What's New in v2.0

- **NegoLinks dark enterprise theme** — `#080810` base, Community Green `#16A34A` accent
- **AI Platform** — 10-provider support (Groq Cloud default), AI Settings page, usage logs
- **Demo Data Manager** — 5 scenarios, DEMO MODE banner, full audit trail
- **Notification Center** — real-time bell icon, mark read, in-app alerts
- **Feature Flags** — toggle modules/AI/beta features without code changes
- **Background Jobs** — scheduled AI reports, reminders, backups
- **System Health** — DB/API/AI health dashboard
- **Rich Dashboard** — Recharts area/pie charts, AI Insights panel
- **AI Assistant** — full chat UI with live data context
- **Universal Search** — ⌘K command palette across all modules
- **Zero TypeScript errors** · clean production build

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | included with Node |
| Supabase CLI | latest | `npm i -g supabase` |
| Vercel CLI | latest | `npm i -g vercel` |

---

## Step 1 — Supabase Project

1. Go to https://supabase.com → New project
2. Pick a region close to your users (e.g. **eu-west-1** for Africa)
3. Save your credentials:
   - Project URL: `https://xxxx.supabase.co`
   - Anon key: from Settings → API
   - Service role key: from Settings → API (keep secret)

---

## Step 2 — Run Database Migrations

Open **SQL Editor** in your Supabase dashboard and run these files in order:

```
supabase/migrations/001_core.sql       ← members, savings, shares, enums
supabase/migrations/002_finance.sql    ← loans, GL, investments, assets, HR
supabase/migrations/003_governance.sql ← committees, meetings, elections
supabase/migrations/004_rls.sql        ← Row Level Security on all 46 tables
supabase/migrations/005_enterprise.sql ← AI, feature flags, notifications, jobs
```

> **Tip:** Paste each file's contents into the SQL editor and click **Run**.

### Add demo data columns (required for Demo Data Manager)

```sql
ALTER TABLE members   ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
```

---

## Step 3 — Deploy the AI Edge Function

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the AI assistant function
supabase functions deploy ai-assistant

# Set AI provider secrets (Groq Cloud — default)
supabase secrets set AI_PROVIDER=groq
supabase secrets set AI_API_KEY=gsk_YOUR_GROQ_API_KEY
supabase secrets set AI_BASE_URL=https://api.groq.com/openai/v1
supabase secrets set AI_MODEL=llama-3.3-70b-versatile
```

**Get a free Groq API key:** https://console.groq.com → API Keys → Create

> You can switch providers anytime from **Settings → AI Platform** without redeploying.

---

## Step 4 — Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Step 5 — Install & Run Locally

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Step 6 — Deploy to Vercel

```bash
# Option A: Vercel CLI
vercel --prod

# Option B: Connect GitHub repo at vercel.com
# Set env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

**Custom domain:** In Vercel → Domains → Add `cooperative.negolinks.com`  
Set CNAME record at your DNS provider pointing to Vercel.

---

## Step 7 — First Login

1. Open the app → **Create Account** (first account = Super Admin)
2. Go to **Settings** → fill in your organization details
3. Go to **Settings → AI Platform** → confirm Groq is configured
4. Go to **Settings → Demo Data** → load a demo scenario to explore the platform

---

## Module Reference

| Module | URL | Description |
|--------|-----|-------------|
| Dashboard | `/` | KPI cards, charts, AI insights |
| Members | `/members` | Registration, KYC, digital cards, QR |
| Savings | `/savings` | Accounts, transactions, passbook |
| Loans | `/loans` | Applications, disbursement, repayments |
| Finance | `/finance` | General Ledger, journals, statements |
| Shares | `/shares` | Share purchases, dividends |
| Investments | `/investments` | Investment portfolio |
| Governance | `/governance` | Meetings, resolutions, elections |
| Procurement | `/procurement` | Vendors, POs, assets |
| HR | `/hr` | Employees, attendance, leave |
| Communications | `/communications` | Email, SMS, WhatsApp |
| Reports | `/reports` | CSV exports (13 report types) |
| Audit | `/audit` | Tamper-evident audit trail |
| AI Assistance | `/ai` | Executive chat assistant |
| Settings | `/settings` | Org, branding, users, branches |
| AI Platform | `/settings/ai` | Provider config, usage logs |
| Demo Data | `/settings/demo` | Load/delete demo scenarios |
| System Admin | `/settings/system` | Feature flags, jobs, health |

---

## AI Provider Configuration

Configure from **Settings → AI Platform** or via Supabase secrets:

| Provider | Secret values |
|----------|--------------|
| Groq (default) | `AI_PROVIDER=groq` `AI_API_KEY=gsk_...` |
| OpenAI | `AI_PROVIDER=openai` `AI_API_KEY=sk-...` |
| Anthropic | `AI_PROVIDER=anthropic` `AI_API_KEY=sk-ant-...` |
| Gemini | `AI_PROVIDER=gemini` `AI_API_KEY=AIza...` |
| DeepSeek | `AI_PROVIDER=deepseek` `AI_API_KEY=...` |
| OpenRouter | `AI_PROVIDER=openrouter` `AI_API_KEY=sk-or-...` |
| Ollama | `AI_PROVIDER=ollama` `AI_BASE_URL=http://localhost:11434/v1` |

> AI is always branded as **"AI Assistance"** — the provider is never shown to users.

---

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Full system access |
| Org Owner | Full org access |
| Managing Director | Full org, no system settings |
| Branch Manager | Branch scope |
| Loan Officer | Loan module |
| Teller / Savings Officer | Savings & transactions |
| Accountant | Finance module |
| HR Officer | HR module |
| Board Chairman/Member | Governance |
| Member | Portal view only |

---

## Supabase Storage Setup (optional)

For logo, letterhead, stamp, and signature uploads:

1. Supabase Dashboard → Storage → New bucket: `org-assets` (public)
2. Upload files → copy the public URL
3. Paste into **Settings → Branding** fields

---

## Troubleshooting

**"AI Assistance is not configured"**  
→ Run `supabase functions deploy ai-assistant` and set `AI_API_KEY` secret.

**"RLS policy violation"**  
→ Ensure `004_rls.sql` ran successfully. Check that `is_staff()` function exists.

**"Demo data load failed"**  
→ Run the `ALTER TABLE` commands in Step 2 to add `is_demo` columns.

**Build errors**  
→ Delete `node_modules` and `dist`, run `npm install` again.

---

## Support

📧 info@negolinks.com  
📞 +2348063337624 · +2349067761126  
🌐 www.negolinks.com  

---

*Powered by NegoLinks Enterprise Suite · © 2025 Nego Links Systems Ltd.*
