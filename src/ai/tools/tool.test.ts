import { describe, it, expect, vi } from 'vitest';
import { executeTool } from './tool-registry';

const queryMock = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: { id: "test-prop-id", status: "pending", expires_at: "2099-01-01T00:00:00Z", payload: { tasks: [{ title: "T1" }] } },
    error: null
  }),
  order: vi.fn().mockResolvedValue({ data: [], error: null })
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      ...queryMock,
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }))
  }))
}));

describe("Tool Registry", () => {
  it("draft_goal_plan tool parses arguments and returns JSON", async () => {
    const inputArgs = {
      goal: "Test Goal",
      success_metric: "Tests passed",
      scope: "Full scope",
      target_date: null,
      constraints: ["C1"],
      available_resources: ["R1"],
      existing_goal_id: null
    };

    const result = await executeTool("draft_goal_plan", inputArgs, { authenticated_user_id: "user-1" } as any);
    expect(result.plan).toHaveProperty("goal", "Test Goal");
    expect(result.plan.constraints[0]).toBe("C1");
  });

  it("create_internal_tasks rejects with invalid confirmation token", async () => {
    const args = {
      proposal_id: "test-prop-id",
      confirmation_token: "INVALID",
      idempotency_key: "key-1"
    };

    const result = await executeTool("create_internal_tasks", args, { authenticated_user_id: "user-1" } as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid confirmation token.");
  });

  it("create_internal_tasks accepts valid confirmation execution payload", async () => {
    const args = {
      proposal_id: "test-prop-id",
      confirmation_token: "token_test-prop-id",
      idempotency_key: "key-2"
    };
    
    // override single for existing execution check to return null (no execution)
    queryMock.single.mockResolvedValueOnce({
      data: { id: "test-prop-id", status: "pending", expires_at: "2099-01-01T00:00:00Z", payload: { tasks: [{ title: "T1" }] } },
      error: null
    }).mockResolvedValueOnce({ data: null, error: null }) // execution check
      .mockResolvedValueOnce({ data: { id: "exec-1" }, error: null }) // insert execution
      .mockResolvedValueOnce({ data: { id: "task-1" }, error: null }); // insert task

    const result = await executeTool("create_internal_tasks", args, { authenticated_user_id: "user-1" } as any);
    expect(result.success).toBe(true);
    expect(result.created_task_ids).toBeDefined();
  });

  it("get_user_context executes successfully", async () => {
    const result = await executeTool("get_user_context", { fields: ["timezone", "display_name"] }, { authenticated_user_id: "user-1", user_timezone: "UTC", profile_and_preferences: { display_name: "User" } } as any);
    expect(result).toHaveProperty("timezone", "UTC");
  });
});
