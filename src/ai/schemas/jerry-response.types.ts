export type Intent = 'answer' | 'plan' | 'decision' | 'internal_write' | 'external_write' | 'unsupported';

export type Status = 'needs_clarification' | 'needs_confirmation' | 'needs_approval' | 'in_progress' | 'completed' | 'failed' | 'unsupported';

export type Priority = 'low' | 'medium' | 'high';

export interface Milestone {
  title: string;
  definition_of_done: string;
}

export interface Task {
  title: string;
  priority: Priority;
  due_at: string | null;
  rationale: string;
}

export interface Risk {
  risk: string;
  mitigation: string;
}

export interface Plan {
  goal: string;
  success_metric: string | null;
  scope: string | null;
  assumptions: string[];
  milestones: Milestone[];
  tasks: Task[];
  risks: Risk[];
}

export interface Citation {
  source_id: string;
  source_title: string | null;
  source_type: string | null;
  location: string | null;
  excerpt: string | null;
  url: string | null;
}

export type RiskTier = 'R0' | 'R1' | 'R2' | 'R3';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected' | 'expired' | 'consumed';

export interface Action {
  action_id: string | null;
  action_type: string;
  tool_name: string;
  risk_tier: RiskTier;
  proposal_payload: any;
  approval_required: boolean;
  approval_status: ApprovalStatus;
  approval_expires_at: string | null;
  idempotency_key: string | null;
  provider_result: any | null;
}

export type MemoryStatus = 'proposed' | 'approved' | 'edited' | 'rejected' | 'deleted' | 'expired';

export interface Memory {
  proposal_id: string | null;
  memory_text: string;
  category: string;
  reason: string;
  source: string;
  expires_at: string | null;
  status: MemoryStatus;
}

export type ExecutionState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Execution {
  execution_id: string | null;
  execution_type: string;
  state: ExecutionState;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retryable: boolean;
  verified: boolean;
}

export type UncertaintyLevel = 'low' | 'medium' | 'high';

export interface Uncertainty {
  level: UncertaintyLevel;
  unknowns: string[];
  counterargument: string | null;
}

export interface JerryResponse {
  schema_version: string;
  intent: Intent;
  status: Status;
  user_message: string;
  clarifying_questions: string[];
  answer: string | null;
  plan: Plan | null;
  citations: Citation[];
  action: Action | null;
  memory: Memory | null;
  execution: Execution | null;
  uncertainty: Uncertainty | null;
  next_step: string | null;
}
