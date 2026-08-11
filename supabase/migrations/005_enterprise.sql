-- =====================================================================
-- NegoLinks Cooperative ERP — Migration 005: Enterprise Features
-- AI Platform, Notifications, Feature Flags, Demo Data, Background Jobs
-- =====================================================================

-- AI Platform Configuration (encrypted at rest via Supabase Vault in production)
CREATE TABLE IF NOT EXISTS ai_platform_config (
  id            integer PRIMARY KEY DEFAULT 1,
  provider      text    NOT NULL DEFAULT 'groq',
  model         text    NOT NULL DEFAULT 'llama-3.3-70b-versatile',
  base_url      text    NOT NULL DEFAULT 'https://api.groq.com/openai/v1',
  temperature   numeric(3,2) DEFAULT 0.7,
  max_tokens    integer DEFAULT 4096,
  streaming     boolean DEFAULT false,
  ai_brand_name text    DEFAULT 'AI Assistance',
  -- Module toggles
  ai_dashboard  boolean DEFAULT true,
  ai_members    boolean DEFAULT true,
  ai_loans      boolean DEFAULT true,
  ai_savings    boolean DEFAULT true,
  ai_finance    boolean DEFAULT true,
  ai_governance boolean DEFAULT true,
  ai_hr         boolean DEFAULT true,
  ai_comms      boolean DEFAULT true,
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO ai_platform_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- AI Usage Logs
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module         text NOT NULL DEFAULT 'general',
  model_used     text,
  response_chars integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- AI Prompt Templates
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module      text NOT NULL,
  name        text NOT NULL,
  prompt      text NOT NULL,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Feature Flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  label       text NOT NULL,
  description text,
  enabled     boolean DEFAULT true,
  category    text DEFAULT 'module',  -- module | ai | beta | integration
  updated_at  timestamptz DEFAULT now()
);

-- Seed feature flags
INSERT INTO feature_flags (key, label, description, category, enabled) VALUES
  ('module_members',     'Members Module',        'Member registration, KYC, digital cards', 'module', true),
  ('module_savings',     'Savings Module',        'Savings accounts and transactions', 'module', true),
  ('module_loans',       'Loans Module',          'Loan applications and management', 'module', true),
  ('module_finance',     'General Ledger',        'Journals, trial balance, statements', 'module', true),
  ('module_shares',      'Shares & Dividends',    'Share purchases and dividend distribution', 'module', true),
  ('module_investments', 'Investments',           'Investment portfolio tracking', 'module', true),
  ('module_governance',  'Governance Module',     'Meetings, resolutions, elections', 'module', true),
  ('module_procurement', 'Procurement & Assets',  'Vendors, POs, asset register', 'module', true),
  ('module_hr',          'Human Resources',       'Employees, attendance, leave', 'module', true),
  ('module_comms',       'Communications',        'Email, SMS, WhatsApp messaging', 'module', true),
  ('ai_dashboard',       'AI Dashboard Insights', 'AI-generated executive summaries', 'ai', true),
  ('ai_assistant',       'AI Executive Assistant','Chat-based AI assistance', 'ai', true),
  ('ai_drafting',        'AI Message Drafting',   'AI-assisted communication drafts', 'ai', true),
  ('demo_data',          'Demo Data Manager',     'Load/delete demo scenarios', 'beta', true),
  ('advanced_reports',   'Advanced Reports',      'PDF/DOCX/XLSX export engine', 'beta', true)
ON CONFLICT (key) DO NOTHING;

-- Notification Center
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text,
  type        text DEFAULT 'info',   -- info | success | warning | error
  module      text,
  action_url  text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- Background Jobs
CREATE TABLE IF NOT EXISTS background_jobs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  job_type     text NOT NULL,  -- ai_report | reminder | notification | backup | sync
  schedule     text,           -- cron expression
  last_run_at  timestamptz,
  next_run_at  timestamptz,
  status       text DEFAULT 'idle',   -- idle | running | completed | failed
  result       jsonb,
  enabled      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO background_jobs (name, job_type, schedule, enabled) VALUES
  ('Daily AI Executive Report',    'ai_report',    '0 7 * * *',  true),
  ('Loan Repayment Reminders',     'reminder',     '0 8 * * *',  true),
  ('Savings Due Notifications',    'notification', '0 9 * * 1',  true),
  ('Meeting Reminders',            'reminder',     '0 8 * * *',  true),
  ('Monthly Summary Report',       'ai_report',    '0 6 1 * *',  true),
  ('Database Backup',              'backup',       '0 2 * * *',  true)
ON CONFLICT DO NOTHING;

-- Backup History
CREATE TABLE IF NOT EXISTS backup_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text DEFAULT 'manual',    -- manual | scheduled
  status      text DEFAULT 'pending',   -- pending | completed | failed | verified
  size_bytes  bigint,
  storage_url text,
  initiated_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- System Health Snapshots
CREATE TABLE IF NOT EXISTS system_health_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  db_response_ms  integer,
  ai_status       text DEFAULT 'unknown',
  storage_used_mb numeric(10,2),
  active_users    integer DEFAULT 0,
  error_count     integer DEFAULT 0,
  recorded_at     timestamptz DEFAULT now()
);

-- Demo Data Control
CREATE TABLE IF NOT EXISTS demo_data_control (
  id          integer PRIMARY KEY DEFAULT 1,
  is_active   boolean DEFAULT false,
  scenario    text DEFAULT 'medium',
  loaded_at   timestamptz,
  loaded_by   uuid REFERENCES auth.users(id),
  CONSTRAINT single_demo CHECK (id = 1)
);
INSERT INTO demo_data_control (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Dashboard Layout (per user)
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  layout  jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  url         text NOT NULL,
  secret      text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  events      text[] DEFAULT '{}',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  key_hash    text NOT NULL UNIQUE,
  key_preview text NOT NULL,
  scopes      text[] DEFAULT '{}',
  rate_limit  integer DEFAULT 1000,
  last_used_at timestamptz,
  expires_at  timestamptz,
  revoked     boolean DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

-- RLS for new tables
ALTER TABLE ai_platform_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_data_control    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;

-- Staff can read AI config, only admins update
CREATE POLICY "ai_config_read"   ON ai_platform_config FOR SELECT USING (is_staff());
CREATE POLICY "ai_config_admin"  ON ai_platform_config FOR UPDATE USING (is_admin());

-- AI usage logs: staff insert, staff read
CREATE POLICY "ai_logs_insert"   ON ai_usage_logs FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "ai_logs_read"     ON ai_usage_logs FOR SELECT USING (is_admin());

-- Prompt templates: staff read, admin manage
CREATE POLICY "prompt_read"      ON ai_prompt_templates FOR SELECT USING (is_staff());
CREATE POLICY "prompt_admin"     ON ai_prompt_templates FOR ALL USING (is_admin());

-- Feature flags: staff read, admin manage
CREATE POLICY "ff_read"          ON feature_flags FOR SELECT USING (is_staff());
CREATE POLICY "ff_admin"         ON feature_flags FOR ALL USING (is_admin());

-- Notifications: users see their own
CREATE POLICY "notif_own"        ON notifications FOR ALL USING (user_id = auth.uid());

-- Background jobs: admin only
CREATE POLICY "jobs_admin"       ON background_jobs FOR ALL USING (is_admin());

-- Backups: admin only
CREATE POLICY "backup_admin"     ON backup_history FOR ALL USING (is_admin());

-- System health: staff read, no insert from client
CREATE POLICY "health_read"      ON system_health_log FOR SELECT USING (is_admin());

-- Demo data control: admin only
CREATE POLICY "demo_admin"       ON demo_data_control FOR ALL USING (is_admin());

-- Dashboard layouts: own only
CREATE POLICY "layout_own"       ON dashboard_layouts FOR ALL USING (user_id = auth.uid());

-- Webhooks & API keys: admin
CREATE POLICY "webhook_admin"    ON webhooks FOR ALL USING (is_admin());
CREATE POLICY "apikey_admin"     ON api_keys  FOR ALL USING (is_admin());
