import { z } from 'zod';

export const MilestoneSchema = z.object({
  title: z.string(),
  definition_of_done: z.string(),
}).strict();

export const TaskSchema = z.object({
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  due_at: z.string().nullable(),
  rationale: z.string(),
}).strict();

export const RiskSchema = z.object({
  risk: z.string(),
  mitigation: z.string(),
}).strict();

export const PlanSchema = z.object({
  goal: z.string(),
  success_metric: z.string().nullable(),
  scope: z.string().nullable(),
  assumptions: z.array(z.string()),
  milestones: z.array(MilestoneSchema),
  tasks: z.array(TaskSchema),
  risks: z.array(RiskSchema),
}).strict();

export const CitationSchema = z.object({
  source_id: z.string(),
  source_title: z.string().nullable(),
  source_type: z.string().nullable(),
  location: z.string().nullable(),
  excerpt: z.string().nullable(),
  url: z.string().nullable(),
}).strict();

export const ActionSchema = z.object({
  action_id: z.string().nullable(),
  action_type: z.string(),
  tool_name: z.string(),
  risk_tier: z.enum(['R0', 'R1', 'R2', 'R3']),
  proposal_payload: z.any(),
  approval_required: z.boolean(),
  approval_status: z.enum(['not_required', 'pending', 'approved', 'rejected', 'expired', 'consumed']),
  approval_expires_at: z.string().nullable(),
  idempotency_key: z.string().nullable(),
  provider_result: z.any().nullable(),
}).strict();

export const MemorySchema = z.object({
  proposal_id: z.string().nullable(),
  memory_text: z.string(),
  category: z.string(),
  reason: z.string(),
  source: z.string(),
  expires_at: z.string().nullable(),
  status: z.enum(['proposed', 'approved', 'edited', 'rejected', 'deleted', 'expired']),
}).strict();

export const ExecutionSchema = z.object({
  execution_id: z.string().nullable(),
  execution_type: z.string(),
  state: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  retryable: z.boolean(),
  verified: z.boolean(),
}).strict();

export const UncertaintySchema = z.object({
  level: z.enum(['low', 'medium', 'high']),
  unknowns: z.array(z.string()),
  counterargument: z.string().nullable(),
}).strict();

export const JerryResponseSchema = z.object({
  schema_version: z.string(),
  intent: z.enum(['answer', 'plan', 'decision', 'internal_write', 'external_write', 'unsupported']),
  status: z.enum(['needs_clarification', 'needs_confirmation', 'needs_approval', 'in_progress', 'completed', 'failed', 'unsupported']),
  user_message: z.string(),
  clarifying_questions: z.array(z.string()),
  answer: z.string().nullable(),
  plan: PlanSchema.nullable(),
  citations: z.array(CitationSchema),
  action: ActionSchema.nullable(),
  memory: MemorySchema.nullable(),
  execution: ExecutionSchema.nullable(),
  uncertainty: UncertaintySchema.nullable(),
  next_step: z.string().nullable(),
}).strict();
