-- 00002_goals_and_tasks.sql
-- Migration for Goals, Tasks, and Internal Actions with strict RLS

-- ==========================================
-- 1. Create Tables
-- ==========================================

CREATE TABLE IF NOT EXISTS goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    success_metric text,
    target_date timestamptz,
    status text not null default 'active',
    priority text not null default 'medium',
    progress integer not null default 0,
    source_conversation_id uuid references conversations(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,
    
    constraint goals_status_check check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
    constraint goals_priority_check check (priority in ('low', 'medium', 'high')),
    constraint goals_progress_check check (progress >= 0 and progress <= 100),
    constraint goals_title_length check (char_length(title) > 0 and char_length(title) <= 160),
    constraint goals_desc_length check (description is null or char_length(description) <= 5000)
);

CREATE TABLE IF NOT EXISTS tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    goal_id uuid references goals(id) on delete cascade,
    title text not null,
    description text,
    status text not null default 'todo',
    priority text not null default 'medium',
    due_at timestamptz,
    completed_at timestamptz,
    source_conversation_id uuid references conversations(id) on delete set null,
    source_action_id text,
    position integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz,

    constraint tasks_status_check check (status in ('todo', 'in_progress', 'blocked', 'completed', 'archived')),
    constraint tasks_priority_check check (priority in ('low', 'medium', 'high')),
    constraint tasks_title_length check (char_length(title) > 0 and char_length(title) <= 200),
    constraint tasks_desc_length check (description is null or char_length(description) <= 5000)
);

CREATE TABLE IF NOT EXISTS internal_action_proposals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    conversation_id uuid references conversations(id) on delete cascade,
    action_type text not null,
    payload jsonb not null,
    payload_hash text not null,
    status text not null default 'pending',
    expires_at timestamptz not null,
    confirmed_at timestamptz,
    rejected_at timestamptz,
    executed_at timestamptz,
    created_at timestamptz not null default now(),

    constraint proposals_status_check check (status in ('pending', 'confirmed', 'rejected', 'expired', 'executed', 'failed')),
    constraint proposals_action_type_check check (action_type in ('create_tasks', 'create_goal', 'update_task', 'update_goal'))
);

CREATE TABLE IF NOT EXISTS internal_action_executions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    proposal_id uuid not null references internal_action_proposals(id) on delete cascade,
    idempotency_key text not null,
    state text not null,
    result jsonb,
    safe_error_message text,
    started_at timestamptz not null default now(),
    completed_at timestamptz,

    constraint executions_state_check check (state in ('queued', 'running', 'completed', 'failed', 'cancelled')),
    constraint executions_idempotency_unique unique (user_id, idempotency_key)
);

-- ==========================================
-- 2. Create Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS goals_user_status_date_idx ON goals(user_id, status, target_date);
CREATE INDEX IF NOT EXISTS goals_user_updated_desc_idx ON goals(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS tasks_user_status_due_idx ON tasks(user_id, status, due_at);
CREATE INDEX IF NOT EXISTS tasks_goal_position_idx ON tasks(goal_id, position);
CREATE INDEX IF NOT EXISTS tasks_user_priority_due_idx ON tasks(user_id, priority, due_at);

CREATE INDEX IF NOT EXISTS proposals_user_status_created_idx ON internal_action_proposals(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS executions_user_proposal_idx ON internal_action_executions(user_id, proposal_id);

-- ==========================================
-- 3. Row Level Security (RLS)
-- ==========================================

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_action_executions ENABLE ROW LEVEL SECURITY;

-- Goals Policies
CREATE POLICY "Users can only read their own goals" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own goals" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own goals" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own goals" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tasks Policies
CREATE POLICY "Users can only read their own tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Proposals Policies
CREATE POLICY "Users can only read their own proposals" ON internal_action_proposals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own proposals" ON internal_action_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own proposals" ON internal_action_proposals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own proposals" ON internal_action_proposals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Executions Policies
CREATE POLICY "Users can only read their own executions" ON internal_action_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own executions" ON internal_action_executions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own executions" ON internal_action_executions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own executions" ON internal_action_executions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- 4. Triggers for updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_modtime BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
