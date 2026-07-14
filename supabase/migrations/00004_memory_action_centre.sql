-- 00004_memory_action_centre.sql
-- Migration: Memory and Action Centre tables with RLS policies

-- Table: memory_proposals
CREATE TABLE IF NOT EXISTS memory_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  category text NOT NULL CHECK (category IN ('preference','communication_style','long_term_goal','recurring_workflow','project_context','professional_context','academic_context')),
  content jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('proposed','approved','edited','rejected','expired','deleted')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: memories (active records)
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_proposal_id uuid NOT NULL REFERENCES memory_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  category text NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('active','expired','deleted')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: external_action_proposals
CREATE TABLE IF NOT EXISTS external_action_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL CHECK (provider IN ('google')),
  tool text NOT NULL CHECK (tool IN ('gmail_draft','calendar_event')),
  action_type text NOT NULL,
  risk_tier text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','approved','rejected','expired','executing','completed','failed','cancelled')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table: external_action_approvals (audit of approvals)
CREATE TABLE IF NOT EXISTS external_action_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES external_action_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  token_hash text NOT NULL,
  payload_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  revoked_at timestamp with time zone,
  approved_at timestamp with time zone DEFAULT now()
);

-- Table: external_action_executions
CREATE TABLE IF NOT EXISTS external_action_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES external_action_proposals(id) ON DELETE CASCADE,
  execution_status text NOT NULL CHECK (execution_status IN ('queued','running','completed','failed','cancelled')),
  provider_response jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: connected_accounts (public metadata about linked providers)
CREATE TABLE IF NOT EXISTS connected_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  email text,
  scopes text[],
  status text NOT NULL CHECK (status IN ('connected','revoked')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security for all new tables
ALTER TABLE memory_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_action_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_action_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_action_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies (auth.uid() = user_id)
-- memory_proposals
CREATE POLICY "User can select own memory proposals" ON memory_proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own memory proposals" ON memory_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own memory proposals" ON memory_proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own memory proposals" ON memory_proposals FOR DELETE USING (auth.uid() = user_id);

-- memories
CREATE POLICY "User can select own memories" ON memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can update own memories" ON memories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own memories" ON memories FOR DELETE USING (auth.uid() = user_id);

-- external_action_proposals
CREATE POLICY "User can select own external action proposals" ON external_action_proposals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own external action proposals" ON external_action_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own external action proposals" ON external_action_proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own external action proposals" ON external_action_proposals FOR DELETE USING (auth.uid() = user_id);

-- external_action_approvals
CREATE POLICY "User can select own external action approvals" ON external_action_approvals FOR SELECT USING (auth.uid() = (SELECT user_id FROM external_action_proposals WHERE external_action_proposals.id = proposal_id));

-- external_action_executions
CREATE POLICY "User can select own external action executions" ON external_action_executions FOR SELECT USING (auth.uid() = (SELECT user_id FROM external_action_proposals WHERE external_action_proposals.id = proposal_id));

-- Atomic consumption RPC
CREATE OR REPLACE FUNCTION consume_external_action_approval(
  p_proposal_id uuid,
  p_token_hash text,
  p_payload_hash text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_approval external_action_approvals%ROWTYPE;
  v_proposal external_action_proposals%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'Unauthenticated');
  END IF;

  -- 1. Lock and fetch approval
  SELECT * INTO v_approval
  FROM external_action_approvals
  WHERE proposal_id = p_proposal_id
    AND token_hash = p_token_hash
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at >= now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid, expired, or already consumed approval');
  END IF;

  -- 2. Lock and fetch proposal to ensure it belongs to the user and is approved
  SELECT * INTO v_proposal
  FROM external_action_proposals
  WHERE id = p_proposal_id
    AND user_id = v_user_id
    AND status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Proposal not found or not approved for user');
  END IF;

  -- 3. Verify payload hashes match
  IF v_proposal.payload_hash != p_payload_hash OR v_approval.payload_hash != p_payload_hash THEN
    RETURN json_build_object('error', 'Payload mismatch');
  END IF;

  -- 4. Mark approval as consumed
  UPDATE external_action_approvals
  SET consumed_at = now()
  WHERE id = v_approval.id;

  -- 5. Return success
  RETURN json_build_object(
    'success', true,
    'approval_id', v_approval.id,
    'proposal_id', v_proposal.id
  );
END;
$$;

-- connected_accounts
CREATE POLICY "User can select own connected accounts" ON connected_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own connected accounts" ON connected_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can update own connected accounts" ON connected_accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can delete own connected accounts" ON connected_accounts FOR DELETE USING (auth.uid() = user_id);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_memory_proposals_user_status ON memory_proposals(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_status ON memories(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_action_proposals_user_status ON external_action_proposals(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_action_executions_proposal ON external_action_executions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
