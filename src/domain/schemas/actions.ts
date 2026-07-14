import { z } from "zod";

// A basic recursive JSON type for zod
type Literal = boolean | number | string | null;
type Json = Literal | { [key: string]: Json } | Json[];

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const ActionProposalStatusEnum = z.enum(["pending", "confirmed", "rejected", "expired", "executed", "failed"]);
export const ActionExecutionStateEnum = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export const ActionTypeEnum = z.enum(["create_tasks", "create_goal", "update_task", "update_goal"]);

export const InternalActionProposalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  conversation_id: z.string().uuid().nullable(),
  action_type: ActionTypeEnum,
  payload: jsonSchema,
  payload_hash: z.string(),
  status: ActionProposalStatusEnum,
  expires_at: z.string().datetime(),
  confirmed_at: z.string().datetime().nullable(),
  rejected_at: z.string().datetime().nullable(),
  executed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

export type InternalActionProposal = z.infer<typeof InternalActionProposalSchema>;

export const InternalActionExecutionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  idempotency_key: z.string(),
  state: ActionExecutionStateEnum,
  result: jsonSchema.nullable(),
  safe_error_message: z.string().nullable(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});

export type InternalActionExecution = z.infer<typeof InternalActionExecutionSchema>;
