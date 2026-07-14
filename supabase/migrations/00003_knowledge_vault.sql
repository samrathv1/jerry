-- 00003_knowledge_vault.sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: knowledge_documents
CREATE TABLE public.knowledge_documents (
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
CREATE TABLE public.knowledge_chunks (
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
CREATE TABLE public.knowledge_processing_jobs (
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
CREATE TABLE public.knowledge_query_events (
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
CREATE POLICY knowledge_documents_select ON public.knowledge_documents
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY knowledge_documents_insert ON public.knowledge_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY knowledge_documents_update ON public.knowledge_documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY knowledge_documents_delete ON public.knowledge_documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for knowledge_chunks
CREATE POLICY knowledge_chunks_select ON public.knowledge_chunks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY knowledge_chunks_insert ON public.knowledge_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY knowledge_chunks_update ON public.knowledge_chunks
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for processing jobs
CREATE POLICY knowledge_jobs_select ON public.knowledge_processing_jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY knowledge_jobs_insert ON public.knowledge_processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY knowledge_jobs_update ON public.knowledge_processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for query events (read only)
CREATE POLICY knowledge_query_events_select ON public.knowledge_query_events
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_knowledge_documents_user_status ON public.knowledge_documents (user_id, status, updated_at DESC);
CREATE INDEX idx_knowledge_chunks_doc_idx ON public.knowledge_chunks (document_id, chunk_index);
CREATE INDEX idx_knowledge_chunks_user_doc ON public.knowledge_chunks (user_id, document_id);
CREATE INDEX idx_knowledge_jobs_user_state ON public.knowledge_processing_jobs (user_id, state, created_at);
CREATE INDEX idx_knowledge_query_events_user_created ON public.knowledge_query_events (user_id, created_at DESC);

-- Vector similarity index (IVFFlat) for embeddings
CREATE INDEX idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

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
