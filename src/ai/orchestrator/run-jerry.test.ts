import { describe, it, expect, vi, beforeEach } from "vitest";
import { runJerry } from "./run-jerry";
import { JerryRuntimeContext } from "./jerry-runtime-context";
import * as jerryAgentModule from "./jerry-agent";
import * as loadPromptModule from "../prompts/load-jerry-system-prompt";
import {
  InvalidRequestError,
  PromptLoadFailedError,
  OpenAIRequestFailedError,
  EmptyModelOutputError,
  RepairFailedError,
} from "./orchestration-errors";

vi.mock("server-only", () => ({}));
vi.mock("./jerry-agent");
vi.mock("../prompts/load-jerry-system-prompt");

describe("runJerry Orchestrator", () => {
  const dummyContext: JerryRuntimeContext = {
    authenticated_user_id: "user123",
    current_datetime: "2026-07-14T00:00:00Z",
    user_timezone: "UTC",
    recent_messages: [],
    conversation_summary: null,
    available_tools: [],
    approved_memories: [],
    profile_and_preferences: null,
    goals_and_tasks: null,
    retrieved_chunks: [],
    approval_context: null,
    existing_action_or_execution_id: null,
    prompt_version: "0.1",
  };

  const getValidResponse = (overrides: any = {}) => ({
    schema_version: "0.1",
    intent: "answer",
    status: "completed",
    user_message: "Test",
    clarifying_questions: [],
    answer: "This is a valid answer.",
    plan: null,
    citations: [],
    action: null,
    memory: null,
    execution: null,
    uncertainty: null,
    next_step: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadPromptModule.loadJerrySystemPrompt).mockReturnValue("Mock System Prompt");
  });

  it("1. Valid structured answer passes", async () => {
    const validData = getValidResponse();
    vi.mocked(jerryAgentModule.runJerryAgent).mockResolvedValueOnce({ parsed: validData } as any);

    const result = await runJerry({
      userMessage: "Hello",
      runtimeContext: dummyContext,
    });

    expect(result).toEqual(validData);
    expect(jerryAgentModule.runJerryAgent).toHaveBeenCalledTimes(1);
  });

  it("2. Valid needs_clarification response passes", async () => {
    const clarifData = getValidResponse({
      status: "needs_clarification",
      clarifying_questions: ["What do you mean?"],
    });
    vi.mocked(jerryAgentModule.runJerryAgent).mockResolvedValueOnce({ parsed: clarifData } as any);

    const result = await runJerry({
      userMessage: "Do the thing",
      runtimeContext: dummyContext,
    });

    expect(result).toEqual(clarifData);
    expect(jerryAgentModule.runJerryAgent).toHaveBeenCalledTimes(1);
  });

  it("3. First output invalid, repaired output valid", async () => {
    const invalidData = getValidResponse({ status: "invalid_status" });
    const validData = getValidResponse();

    vi.mocked(jerryAgentModule.runJerryAgent)
      .mockResolvedValueOnce({ parsed: invalidData } as any) // Fails validation
      .mockResolvedValueOnce({ parsed: validData } as any);  // Passes validation

    const result = await runJerry({
      userMessage: "Hello",
      runtimeContext: dummyContext,
    });

    expect(result).toEqual(validData);
    expect(jerryAgentModule.runJerryAgent).toHaveBeenCalledTimes(2);
  });

  it("4. Both initial and repaired outputs invalid", async () => {
    const invalidData1 = getValidResponse({ intent: "unknown" });
    const invalidData2 = getValidResponse({ intent: "still_unknown" });

    vi.mocked(jerryAgentModule.runJerryAgent)
      .mockResolvedValueOnce({ parsed: invalidData1 } as any)
      .mockResolvedValueOnce({ parsed: invalidData2 } as any);

    await expect(
      runJerry({ userMessage: "Hello", runtimeContext: dummyContext })
    ).rejects.toThrow(RepairFailedError);

    expect(jerryAgentModule.runJerryAgent).toHaveBeenCalledTimes(2); // Only one repair attempt occurs
  });

  it("5. Empty model output", async () => {
    vi.mocked(jerryAgentModule.runJerryAgent).mockRejectedValueOnce(new EmptyModelOutputError());

    await expect(
      runJerry({ userMessage: "Hello", runtimeContext: dummyContext })
    ).rejects.toThrow(EmptyModelOutputError);
  });

  it("6. OpenAI request failure", async () => {
    vi.mocked(jerryAgentModule.runJerryAgent).mockRejectedValueOnce(
      new OpenAIRequestFailedError("OpenAI API request failed")
    );

    await expect(
      runJerry({ userMessage: "Hello", runtimeContext: dummyContext })
    ).rejects.toThrow(OpenAIRequestFailedError);
  });

  it("7. Empty user message rejected", async () => {
    await expect(
      runJerry({ userMessage: "   ", runtimeContext: dummyContext })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("8. Oversized message rejected", async () => {
    const largeMessage = "A".repeat(10001);
    await expect(
      runJerry({ userMessage: largeMessage, runtimeContext: dummyContext })
    ).rejects.toThrow(InvalidRequestError);
  });

  it("9. Prompt file missing failure", async () => {
    vi.mocked(loadPromptModule.loadJerrySystemPrompt).mockImplementationOnce(() => {
      throw new Error("File not found");
    });

    await expect(
      runJerry({ userMessage: "Hello", runtimeContext: dummyContext })
    ).rejects.toThrow(PromptLoadFailedError);
  });

  it("10. No secrets or system prompt included in public errors", async () => {
    vi.mocked(jerryAgentModule.runJerryAgent).mockRejectedValueOnce(
      new OpenAIRequestFailedError("OpenAI API request failed", { some: "internal_detail" })
    );

    try {
      await runJerry({ userMessage: "Hello", runtimeContext: dummyContext });
    } catch (error: any) {
      expect(error.message).not.toContain("Mock System Prompt");
      expect(error.message).not.toContain("sk-");
    }
  });

  it("11. No tool calls are accepted in this phase", async () => {
    // Verified by empty available_tools array and no tool calls configured in jerry-agent.ts
    const validData = getValidResponse();
    vi.mocked(jerryAgentModule.runJerryAgent).mockResolvedValueOnce({ parsed: validData } as any);
    await runJerry({ userMessage: "Hello", runtimeContext: dummyContext });
    
    const callArgs = vi.mocked(jerryAgentModule.runJerryAgent).mock.calls[0]?.[0] || [];
    const systemPromptMsg = callArgs.find((m) => m.role === "system" && m.content?.toString().includes("available_tools"));
    
    expect(systemPromptMsg?.content).toContain('"available_tools": []');
  });

  it("12. Only one repair attempt occurs", async () => {
    const invalidData = getValidResponse({ status: "invalid" });
    vi.mocked(jerryAgentModule.runJerryAgent).mockResolvedValue({ parsed: invalidData } as any);

    await expect(
      runJerry({ userMessage: "Hello", runtimeContext: dummyContext })
    ).rejects.toThrow(RepairFailedError);

    expect(jerryAgentModule.runJerryAgent).toHaveBeenCalledTimes(2); // 1 initial + 1 repair = 2
  });
});
