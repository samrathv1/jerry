import { z } from "zod";
import { JerryTool } from "./tool-types";
import { createClient } from "@/lib/supabase/server";

export const ListGoalsTasksInputSchema = z.object({
  goal_statuses: z.array(z.string()).optional(),
  task_statuses: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  due_before: z.string().optional(),
  due_after: z.string().optional(),
  goal_id: z.string().optional(),
  limit: z.number().max(100).optional(),
  include_completed: z.boolean().optional(),
});

type Input = z.infer<typeof ListGoalsTasksInputSchema>;

export const listGoalsTasksTool: JerryTool<Input> = {
  name: "list_goals_tasks",
  definition: {
    type: "function",
    function: {
      name: "list_goals_tasks",
      description: "Retrieve the authenticated user’s goals and tasks. Sorts automatically by priority and due date.",
      parameters: {
        type: "object",
        properties: {
          goal_statuses: { type: "array", items: { type: "string" } },
          task_statuses: { type: "array", items: { type: "string" } },
          priority: { type: "array", items: { type: "string" } },
          due_before: { type: "string" },
          due_after: { type: "string" },
          goal_id: { type: "string" },
          limit: { type: "number" },
          include_completed: { type: "boolean" },
        },
        additionalProperties: false,
      },
      strict: true,
    },
  },
  execute: async (input, context) => {
    const supabase = await createClient();
    
    // Fetch goals
    let goalsQuery = supabase.from("goals").select("*").eq("user_id", context.authenticated_user_id);
    if (input.goal_statuses) goalsQuery = goalsQuery.in("status", input.goal_statuses);
    if (!input.include_completed && !input.goal_statuses) goalsQuery = goalsQuery.neq("status", "completed").neq("status", "archived");
    if (input.goal_id) goalsQuery = goalsQuery.eq("id", input.goal_id);
    
    const { data: goals } = await goalsQuery;

    // Fetch tasks
    let tasksQuery = supabase.from("tasks").select("*, goal:goals(id, priority)").eq("user_id", context.authenticated_user_id);
    if (input.task_statuses) tasksQuery = tasksQuery.in("status", input.task_statuses);
    if (!input.include_completed && !input.task_statuses) tasksQuery = tasksQuery.neq("status", "completed").neq("status", "archived");
    if (input.priority) tasksQuery = tasksQuery.in("priority", input.priority);
    if (input.due_before) tasksQuery = tasksQuery.lte("due_at", input.due_before);
    if (input.due_after) tasksQuery = tasksQuery.gte("due_at", input.due_after);
    if (input.goal_id) tasksQuery = tasksQuery.eq("goal_id", input.goal_id);

    const { data: rawTasks } = await tasksQuery;
    
    let tasks = rawTasks || [];

    // Sorting tasks: 1. overdue, 2. high priority, 3. nearest due date, 4. most recently updated
    const now = new Date().getTime();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    tasks.sort((a, b) => {
      let scoreA = 0; let scoreB = 0;
      // Overdue
      if (a.due_at && new Date(a.due_at).getTime() < now) scoreA += 50;
      if (b.due_at && new Date(b.due_at).getTime() < now) scoreB += 50;
      
      // High Priority
      if (a.priority === "high") scoreA += 20;
      if (b.priority === "high") scoreB += 20;

      if (scoreA !== scoreB) return scoreB - scoreA;

      // Nearest due date
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    if (input.limit) {
      tasks = tasks.slice(0, input.limit);
    }

    // Summary
    let overdue = 0;
    let due_today = 0;
    let blocked = 0;
    let high_priority = 0;

    tasks.forEach(t => {
      if (t.due_at) {
        const time = new Date(t.due_at).getTime();
        if (time < now) overdue++;
        else if (time <= todayEnd.getTime()) due_today++;
      }
      if (t.status === "blocked") blocked++;
      if (t.priority === "high") high_priority++;
      
      // Clean up joined goal from task
      delete t.goal;
    });

    return {
      goals: goals || [],
      tasks,
      summary: {
        overdue,
        due_today,
        blocked,
        high_priority
      }
    };
  },
};
