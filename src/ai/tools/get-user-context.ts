import { z } from "zod";
import { JerryTool } from "./tool-types";
import { createClient } from "@/lib/supabase/server";

export const GetUserContextInputSchema = z.object({
  fields: z.array(z.enum([
    "display_name",
    "timezone",
    "active_goals_summary",
    "task_summary"
  ])),
});

type Input = z.infer<typeof GetUserContextInputSchema>;

export const getUserContextTool: JerryTool<Input> = {
  name: "get_user_context",
  definition: {
    type: "function",
    function: {
      name: "get_user_context",
      description: "Retrieve only the authenticated user context needed for the request.",
      parameters: {
        type: "object",
        properties: {
          fields: {
            type: "array",
            items: {
              type: "string",
              enum: ["display_name", "timezone", "active_goals_summary", "task_summary"],
            },
          },
        },
        required: ["fields"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  execute: async (input, context) => {
    const supabase = await createClient();
    const result: Record<string, any> = {};

    if (input.fields.includes("display_name")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.authenticated_user_id)
        .single();
      result.display_name = profile?.display_name || null;
    }

    if (input.fields.includes("timezone")) {
      result.timezone = context.user_timezone;
    }

    if (input.fields.includes("active_goals_summary")) {
      const { data: goals } = await supabase
        .from("goals")
        .select("id, title, progress, target_date")
        .eq("user_id", context.authenticated_user_id)
        .in("status", ["active", "paused"]);
      
      result.active_goals_summary = goals || [];
    }

    if (input.fields.includes("task_summary")) {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("status")
        .eq("user_id", context.authenticated_user_id)
        .in("status", ["todo", "in_progress", "blocked", "completed"]);

      const summary = { todo: 0, in_progress: 0, blocked: 0, completed: 0 };
      if (tasks) {
        tasks.forEach(t => {
          if (t.status in summary) {
            summary[t.status as keyof typeof summary]++;
          }
        });
      }
      result.task_summary = summary;
    }

    return result;
  },
};
