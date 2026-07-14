import { z } from "zod";
import { JerryTool } from "./tool-types";

export const DraftGoalPlanInputSchema = z.object({
  goal: z.string(),
  success_metric: z.string().nullable(),
  scope: z.string().nullable(),
  target_date: z.string().nullable(),
  constraints: z.array(z.string()),
  available_resources: z.array(z.string()),
  existing_goal_id: z.string().uuid().nullable(),
});

type Input = z.infer<typeof DraftGoalPlanInputSchema>;

export const draftGoalPlanTool: JerryTool<Input> = {
  name: "draft_goal_plan",
  definition: {
    type: "function",
    function: {
      name: "draft_goal_plan",
      description: "Generate a structured plan proposal without saving anything to the database. R0 proposal-only.",
      parameters: {
        type: "object",
        properties: {
          goal: { type: "string" },
          success_metric: { type: ["string", "null"] },
          scope: { type: ["string", "null"] },
          target_date: { type: ["string", "null"] },
          constraints: { type: "array", items: { type: "string" } },
          available_resources: { type: "array", items: { type: "string" } },
          existing_goal_id: { type: ["string", "null"] },
        },
        required: ["goal", "success_metric", "scope", "target_date", "constraints", "available_resources", "existing_goal_id"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  execute: async (input) => {
    // This tool is a NO-OP on the server side because Jerry returning the JSON directly
    // is the intended behavior. Jerry uses this tool definition to format its output to the user.
    // In our orchestration loop, returning the input directly acts as the "plan".
    return {
      message: "Plan proposal drafted successfully. Display the plan to the user.",
      plan: input
    };
  },
};
