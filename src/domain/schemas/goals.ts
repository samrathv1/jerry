import { z } from "zod";

export const GoalStatusEnum = z.enum(["draft", "active", "paused", "completed", "archived"]);
export const GoalPriorityEnum = z.enum(["low", "medium", "high"]);

export const GoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(160),
  description: z.string().max(5000).nullable(),
  success_metric: z.string().nullable(),
  target_date: z.string().datetime().nullable(),
  status: GoalStatusEnum,
  priority: GoalPriorityEnum,
  progress: z.number().min(0).max(100),
  source_conversation_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  archived_at: z.string().datetime().nullable(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const CreateGoalInputSchema = GoalSchema.pick({
  title: true,
  description: true,
  success_metric: true,
  target_date: true,
  status: true,
  priority: true,
  progress: true,
}).partial({
  description: true,
  success_metric: true,
  target_date: true,
  status: true,
  priority: true,
  progress: true,
});

export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

export const UpdateGoalInputSchema = CreateGoalInputSchema.partial();
export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>;
