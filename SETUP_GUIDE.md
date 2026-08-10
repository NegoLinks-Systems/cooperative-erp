# NegoLinks Cooperative & Microfinance ERP v2
## Upgrade Setup Guide

**Deploy URL:** https://cooperative.negolinks.com  
**Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Supabase + Recharts + Vercel  
**Theme:** NegoLinks Dark Enterprise (Community Green accent #16A34A)

---

## Step 1 — Install dependencies

```bash
npm install
```

---

## Step 2 — Configure environment

Create `.env` from the template:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Step 3 — Run Supabase migrations

Open Supabase → SQL Editor. Run each migration in order:

1. `supabase/migrations/001_core.sql`
2. `supabase/migrations/002_finance.sql`
3. `supabase/migrations/003_governance.sql`
4. `supabase/migrations/004_rls.sql`
5. **`supabase/migrations/005_enterprise.sql`** ← NEW (AI, flags, notifications)

After 005, also run these to enable demo data:
```sql
ALTER TABLE members   ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
```

---

## Step 4 — Configure AI Platform (Groq — recommended)

Deploy the upgraded edge function:
```bash
supabase functions deploy ai-assistant
```

Set AI secrets (Groq is the default — get a free API key at console.groq.com):
```bash
supabase secrets set AI_PROVIDER=groq
supabase secrets set AI_API_KEY=gsk_YOUR_GROQ_KEY
supabase secrets set AI_MODEL=llama-3.3-70b-versatile
```

Alternative providers:
```bash
# OpenAI
supabase secrets set AI_PROVIDER=openai AI_API_KEY=sk-... AI_MODEL=gpt-4o

# Anthropic
supabase secrets set AI_PROVIDER=anthropic AI_API_KEY=sk-ant-... AI_MODEL=claude-sonnet-4-6
```

You can also configure the provider in the app under **Settings → AI Platform**.

---

## Step 5 — Deploy to Vercel

```bash
npm run build
```

Connect your GitHub repo to Vercel and set the environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Configure custom domain: `cooperative.negolinks.com`

---

## New in v2

| Feature | Description |
|---------|-------------|
| **Dark Enterprise Theme** | Full NegoLinks dark theme — Community Green accent |
| **New Login Page** | Animated community circles, glassmorphism card |
| **AI Platform** | 10-provider support (Groq default), Settings > AI Platform |
| **Demo Data Manager** | Load/Delete/Reload with 5 scenarios, DEMO MODE banner |
| **Feature Flags** | Toggle any module or AI feature without code changes |
| **Notification Center** | Bell icon, in-app notifications, 30s polling |
| **Background Jobs** | Scheduled jobs management (AI reports, reminders, backups) |
| **System Health** | DB latency, AI status, storage monitor |
| **Universal Search** | ⌘K command palette across all modules |
| **AI Quick Panel** | Gold sparkle icon in navbar for instant AI access |
| **Recharts Dashboard** | Area chart (savings/loans trend), Pie chart (loan status) |
| **AI Executive Summary** | One-click AI analysis of live cooperative performance |
| **New Routes** | /ai, /settings/ai, /settings/demo, /settings/system |

---

## AI Provider Options

| Provider | API Key Format | Default Model |
|----------|---------------|---------------|
| **Groq (default)** | `gsk_...` | llama-3.3-70b-versatile |
| OpenAI | `sk-...` | gpt-4o |
| Anthropic | `sk-ant-...` | claude-sonnet-4-6 |
| DeepSeek | `sk-...` | deepseek-chat |
| OpenRouter | `sk-or-...` | meta-llama/llama-3.3-70b |
| Ollama | — | llama3.2 (self-hosted) |

AI is branded as **"AI Assistance"** to end users — the provider is never exposed.

---

## Support

- Email: info@negolinks.com
- Phone: +2348063337624, +2349067761126
- Website: www.negolinks.com
