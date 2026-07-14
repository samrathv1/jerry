import { JerryTool } from "./tool-types";
import { getUserContextTool } from "./get-user-context";
import { listGoalsTasksTool } from "./list-goals-tasks";
import { draftGoalPlanTool } from "./draft-goal-plan";
import { createInternalTasksTool } from "./create-internal-tasks";

export const jerryTools: JerryTool[] = [
  getUserContextTool,
  listGoalsTasksTool,
  draftGoalPlanTool,
  createInternalTasksTool,
];

export const getToolDefinitions = () => jerryTools.map(t => t.definition);

export async function executeTool(name: string, input: any, context: any) {
  const tool = jerryTools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found in registry.`);
  }
  return await tool.execute(input, context);
}
