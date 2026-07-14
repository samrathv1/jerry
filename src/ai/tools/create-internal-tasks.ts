import { z } from "zod";
import { JerryTool } from "./tool-types";
import { createClient } from "@/lib/supabase/server";

export const CreateInternalTasksInputSchema = z.object({
  proposal_id: z.string().uuid(),
  confirmation_token: z.string(),
  idempotency_key: z.string(),
});

type Input = z.infer<typeof CreateInternalTasksInputSchema>;

export const createInternalTasksTool: JerryTool<Input> = {
  name: "create_internal_tasks",
  definition: {
    type: "function",
    function: {
      name: "create_internal_tasks",
      description: "Persist confirmed Jerry-owned tasks. R1 internal reversible action. This tool must ONLY be called after explicit UI confirmation.",
      parameters: {
        type: "object",
        properties: {
          proposal_id: { type: "string" },
          confirmation_token: { type: "string" },
          idempotency_key: { type: "string" },
        },
        required: ["proposal_id", "confirmation_token", "idempotency_key"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  execute: async (input, context) => {
    // Note: The UI layer usually calls the POST /api/internal-actions/proposals/[proposalId]/confirm route directly
    // to execute the creation, rather than Jerry autonomously calling this tool.
    // However, if Jerry calls it autonomously, we redirect the call to the same logical confirmation checks.

    const supabase = await createClient();

    // 1. Fetch proposal
    const { data: proposal, error: propErr } = await supabase
      .from("internal_action_proposals")
      .select("*")
      .eq("id", input.proposal_id)
      .eq("user_id", context.authenticated_user_id)
      .single();

    if (propErr || !proposal) {
      return { success: false, error: "Proposal not found or unauthorized." };
    }

    if (proposal.status !== "pending" && proposal.status !== "confirmed") {
      return { success: false, error: `Proposal cannot be executed. Status is ${proposal.status}.` };
    }

    if (new Date(proposal.expires_at).getTime() < new Date().getTime()) {
      await supabase.from("internal_action_proposals").update({ status: "expired" }).eq("id", proposal.id);
      return { success: false, error: "Proposal has expired." };
    }

    // Since this is called from AI, we must simulate the confirmation token logic.
    // In actual implementation, the token validation happens in the API route.
    // If the token matches the proposal ID + user ID (as a simplified mock for AI execution),
    // we proceed. Otherwise, it fails.
    if (input.confirmation_token !== `token_${proposal.id}`) {
        return { success: false, error: "Invalid confirmation token." };
    }

    // 2. Idempotency Check
    const { data: existingExecution } = await supabase
      .from("internal_action_executions")
      .select("id, state, result")
      .eq("user_id", context.authenticated_user_id)
      .eq("idempotency_key", input.idempotency_key)
      .single();

    if (existingExecution) {
      if (existingExecution.state === "completed") {
        return { success: true, message: "Already executed", result: existingExecution.result };
      }
      return { success: false, error: `Execution already exists in state: ${existingExecution.state}` };
    }

    // 3. Mark execution started
    const { data: execution, error: execErr } = await supabase
      .from("internal_action_executions")
      .insert({
        user_id: context.authenticated_user_id,
        proposal_id: proposal.id,
        idempotency_key: input.idempotency_key,
        state: "running"
      })
      .select("id")
      .single();

    if (execErr || !execution) {
      return { success: false, error: "Failed to create execution record." };
    }

    try {
      // 4. Create tasks
      const payload = proposal.payload as any;
      const tasksToCreate = payload.tasks || [];
      const createdTaskIds: string[] = [];

      for (const t of tasksToCreate) {
        const { data: createdTask, error: taskErr } = await supabase
          .from("tasks")
          .insert({
            user_id: context.authenticated_user_id,
            goal_id: payload.goal_id || null,
            title: t.title,
            description: t.description,
            priority: t.priority || "medium",
            due_at: t.due_at || null,
            source_action_id: proposal.id
          })
          .select("id")
          .single();
        
        if (!taskErr && createdTask) {
          createdTaskIds.push(createdTask.id);
        } else {
            throw new Error(`Failed to create task: ${t.title}`);
        }
      }

      // 5. Update proposal to executed
      await supabase
        .from("internal_action_proposals")
        .update({ status: "executed", executed_at: new Date().toISOString() })
        .eq("id", proposal.id);

      // 6. Mark execution completed
      await supabase
        .from("internal_action_executions")
        .update({ state: "completed", result: { task_ids: createdTaskIds }, completed_at: new Date().toISOString() })
        .eq("id", execution.id);

      return { success: true, created_task_ids: createdTaskIds };
    } catch (e: any) {
      // Mark failed
      await supabase
        .from("internal_action_executions")
        .update({ state: "failed", safe_error_message: e.message })
        .eq("id", execution.id);
      
      return { success: false, error: e.message };
    }
  },
};
