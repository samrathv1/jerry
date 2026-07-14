-- 00005_n8n_automations.sql
-- Migration: Phase 7 n8n Automations and Webhook Security

-- Table: webhook_credentials
-- Stores the secret key used to sign and verify n8n webhook payloads.
CREATE TABLE IF NOT EXISTS webhook_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Table: automation_definitions
-- Defines the schedule and configuration for proactive workflows.
CREATE TABLE IF NOT EXISTS automation_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('daily_briefing', 'deadline_reminders', 'weekly_review', 'gmail_monitor', 'calendar_monitor')),
  enabled boolean NOT NULL DEFAULT false,
  schedule text, -- e.g., '0 8 * * *' (cron)
  timezone text NOT NULL DEFAULT 'UTC',
  config jsonb DEFAULT '{}'::jsonb,
  last_run timestamp with time zone,
  next_run timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: automation_runs
-- Logs executions of automations triggered by webhooks.
CREATE TABLE IF NOT EXISTS automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL REFERENCES automation_definitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  error jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(definition_id, idempotency_key)
);

-- RLS Enable
ALTER TABLE webhook_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

-- Policies for webhook_credentials
CREATE POLICY "User can select own webhook credentials" ON webhook_credentials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own webhook credentials" ON webhook_credentials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own webhook credentials" ON webhook_credentials FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own webhook credentials" ON webhook_credentials FOR DELETE USING (auth.uid() = user_id);

-- Policies for automation_definitions
CREATE POLICY "User can select own automation definitions" ON automation_definitions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own automation definitions" ON automation_definitions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own automation definitions" ON automation_definitions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own automation definitions" ON automation_definitions FOR DELETE USING (auth.uid() = user_id);

-- Policies for automation_runs
CREATE POLICY "User can select own automation runs" ON automation_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own automation runs" ON automation_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own automation runs" ON automation_runs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_def_user ON automation_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_def ON automation_runs(definition_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_user ON automation_runs(user_id);
