-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Conversations RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON conversations;
CREATE POLICY "Users can create own conversations" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;
CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS conversations_updated_at ON conversations;
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  structured_response JSONB,
  request_id TEXT, -- For idempotency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add index for fast querying by conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
-- Add index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_messages_request_id ON messages(request_id);

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 4. CONVERSATION EVENTS TABLE
CREATE TABLE IF NOT EXISTS conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Conversation Events RLS
ALTER TABLE conversation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON conversation_events;
CREATE POLICY "Users can view own events" ON conversation_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own events" ON conversation_events;
CREATE POLICY "Users can insert own events" ON conversation_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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
DROP POLICY IF EXISTS "Users can only read their own goals" ON goals;
CREATE POLICY "Users can only read their own goals" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own goals" ON goals;
CREATE POLICY "Users can only insert their own goals" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own goals" ON goals;
CREATE POLICY "Users can only update their own goals" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own goals" ON goals;
CREATE POLICY "Users can only delete their own goals" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Tasks Policies
DROP POLICY IF EXISTS "Users can only read their own tasks" ON tasks;
CREATE POLICY "Users can only read their own tasks" ON tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own tasks" ON tasks;
CREATE POLICY "Users can only insert their own tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own tasks" ON tasks;
CREATE POLICY "Users can only update their own tasks" ON tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own tasks" ON tasks;
CREATE POLICY "Users can only delete their own tasks" ON tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Proposals Policies
DROP POLICY IF EXISTS "Users can only read their own proposals" ON internal_action_proposals;
CREATE POLICY "Users can only read their own proposals" ON internal_action_proposals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own proposals" ON internal_action_proposals;
CREATE POLICY "Users can only insert their own proposals" ON internal_action_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own proposals" ON internal_action_proposals;
CREATE POLICY "Users can only update their own proposals" ON internal_action_proposals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own proposals" ON internal_action_proposals;
CREATE POLICY "Users can only delete their own proposals" ON internal_action_proposals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Executions Policies
DROP POLICY IF EXISTS "Users can only read their own executions" ON internal_action_executions;
CREATE POLICY "Users can only read their own executions" ON internal_action_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only insert their own executions" ON internal_action_executions;
CREATE POLICY "Users can only insert their own executions" ON internal_action_executions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only update their own executions" ON internal_action_executions;
CREATE POLICY "Users can only update their own executions" ON internal_action_executions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can only delete their own executions" ON internal_action_executions;
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

DROP TRIGGER IF EXISTS update_goals_modtime ON goals;
CREATE TRIGGER update_goals_modtime BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tasks_modtime ON tasks;
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 00003_knowledge_vault.sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Table: knowledge_documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded',
  extraction_method text,
  page_count integer,
  character_count integer,
  chunk_count integer NOT NULL DEFAULT 0,
  safe_error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  deleted_at timestamptz
);

-- Table: knowledge_chunks
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer,
  page_number integer,
  section_title text,
  location_label text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

-- Table: knowledge_processing_jobs
CREATE TABLE IF NOT EXISTS public.knowledge_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'queued',
  attempt integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  safe_error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: knowledge_query_events
CREATE TABLE IF NOT EXISTS public.knowledge_query_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  query_text_hash text NOT NULL,
  retrieved_chunk_ids uuid[],
  result_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_query_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_documents
DROP POLICY IF EXISTS knowledge_documents_select ON public.knowledge_documents;
CREATE POLICY knowledge_documents_select ON public.knowledge_documents
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
DROP POLICY IF EXISTS knowledge_documents_insert ON public.knowledge_documents;
CREATE POLICY knowledge_documents_insert ON public.knowledge_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_documents_update ON public.knowledge_documents;
CREATE POLICY knowledge_documents_update ON public.knowledge_documents
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_documents_delete ON public.knowledge_documents;
CREATE POLICY knowledge_documents_delete ON public.knowledge_documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for knowledge_chunks
DROP POLICY IF EXISTS knowledge_chunks_select ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_chunks_insert ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_insert ON public.knowledge_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_chunks_update ON public.knowledge_chunks;
CREATE POLICY knowledge_chunks_update ON public.knowledge_chunks
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for processing jobs
DROP POLICY IF EXISTS knowledge_jobs_select ON public.knowledge_processing_jobs;
CREATE POLICY knowledge_jobs_select ON public.knowledge_processing_jobs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_jobs_insert ON public.knowledge_processing_jobs;
CREATE POLICY knowledge_jobs_insert ON public.knowledge_processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS knowledge_jobs_update ON public.knowledge_processing_jobs;
CREATE POLICY knowledge_jobs_update ON public.knowledge_processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for query events (read only)
DROP POLICY IF EXISTS knowledge_query_events_select ON public.knowledge_query_events;
CREATE POLICY knowledge_query_events_select ON public.knowledge_query_events
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_status ON public.knowledge_documents (user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc_idx ON public.knowledge_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_user_doc ON public.knowledge_chunks (user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_user_state ON public.knowledge_processing_jobs (user_id, state, created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_query_events_user_created ON public.knowledge_query_events (user_id, created_at DESC);

-- Vector similarity index (IVFFlat) for embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Search function
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    query_embedding vector(1536),
    match_count integer DEFAULT 5,
    minimum_similarity float DEFAULT 0.6,
    optional_document_ids uuid[] DEFAULT NULL
) RETURNS TABLE (
    chunk_id uuid,
    document_id uuid,
    document_title text,
    content text,
    page_number integer,
    location_label text,
    similarity float
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    kc.id AS chunk_id,
    kc.document_id,
    kd.title AS document_title,
    kc.content,
    kc.page_number,
    kc.location_label,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  JOIN public.knowledge_documents kd ON kc.document_id = kd.id
  WHERE 
    kd.status = 'ready'
    AND kd.deleted_at IS NULL
    AND (optional_document_ids IS NULL OR kc.document_id = ANY(optional_document_ids))
    AND auth.uid() = kd.user_id
    AND 1 - (kc.embedding <=> query_embedding) >= minimum_similarity
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

