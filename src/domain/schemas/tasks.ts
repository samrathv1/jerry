import { z } from "zod";

export const TaskStatusEnum = z.enum(["todo", "in_progress", "blocked", "completed", "archived"]);
export const TaskPriorityEnum = z.enum(["low", "medium", "high"]);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  goal_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  due_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  source_conversation_id: z.string().uuid().nullable(),
  source_action_id: z.string().nullable(),
  position: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  archived_at: z.string().datetime().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskInputSchema = TaskSchema.pick({
  goal_id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  due_at: true,
}).partial({
  goal_id: true,
  description: true,
  status: true,
  priority: true,
  due_at: true,
});

export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const UpdateTaskInputSchema = CreateTaskInputSchema.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
