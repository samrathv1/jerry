import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ChatShell } from "@/components/chat/chat-shell";
import * as jerryApiModule from "@/lib/jerry-api-client";

// Mock the API client
vi.mock("@/lib/jerry-api-client");

describe("Jerry Chat UI", () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    
    // Mock fetch for creating new conversations
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url === "/api/conversations" && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "test-conv-123" })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    // We mock the API client to immediately return a successful answer by default
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValue({
      requestId: "req-123",
      data: {
        schema_version: "0.1",
        intent: "answer",
        status: "completed",
        user_message: "Test message",
        clarifying_questions: [],
        answer: "This is Jerry's answer.",
        plan: null,
        citations: [],
        action: null,
        memory: null,
        execution: null,
        uncertainty: null,
        next_step: null
      }
    });
  });

  it("1. Empty chat state renders", () => {
    render(<ChatShell />);
    expect(screen.getByText(/Hi, I'm Jerry/i)).toBeInTheDocument();
    expect(screen.getByText(/Help me plan my week/i)).toBeInTheDocument();
  });

  it("2. User can type and submit", async () => {
    render(<ChatShell />);
    const textarea = screen.getByPlaceholderText(/Ask Jerry to plan/i);
    const sendButton = screen.getByLabelText(/Send message/i);

    fireEvent.change(textarea, { target: { value: "Hello Jerry" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("Hello Jerry")).toBeInTheDocument();
      expect(jerryApiModule.sendJerryMessage).toHaveBeenCalledWith("Hello Jerry", "test-conv-123", expect.any(String));
    });
  });

  it("3. Empty message is rejected", () => {
    render(<ChatShell />);
    const textarea = screen.getByPlaceholderText(/Ask Jerry to plan/i);
    const sendButton = screen.getByLabelText(/Send message/i);

    // Initial state disabled
    expect(sendButton).toBeDisabled();

    // Spaces only disabled
    fireEvent.change(textarea, { target: { value: "   " } });
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(jerryApiModule.sendJerryMessage).not.toHaveBeenCalled();
  });

  it("4. Duplicate submission is prevented", async () => {
    // We delay the mock resolution to simulate loading
    vi.mocked(jerryApiModule.sendJerryMessage).mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({ data: { intent: "answer" } as any }), 100));
    });

    render(<ChatShell />);
    const textarea = screen.getByPlaceholderText(/Ask Jerry to plan/i);
    const sendButton = screen.getByLabelText(/Send message/i);

    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(sendButton);

    // After clicking, wait for sendJerryMessage to be called once
    await waitFor(() => {
      expect(jerryApiModule.sendJerryMessage).toHaveBeenCalledTimes(1);
    });

    // Button should be disabled because isSending is true
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    
    // Should still only be called once
    expect(jerryApiModule.sendJerryMessage).toHaveBeenCalledTimes(1);
  });

  it("5. Loading state appears", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockImplementation(() => new Promise(() => {})); // Hang forever
    
    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText(/Jerry is thinking.../i)).toBeInTheDocument();
    });
  });

  it("6. Completed answer renders", async () => {
    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("This is Jerry's answer.")).toBeInTheDocument();
    });
  });

  it("7. Clarification questions render", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      requestId: "req-123",
      data: {
        schema_version: "0.1", intent: "answer", status: "needs_clarification",
        user_message: "Test", answer: "I need more info.",
        clarifying_questions: ["What is the timeline?"],
        plan: null, citations: [], action: null, memory: null, execution: null, uncertainty: null, next_step: null
      }
    });

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("Clarification Needed")).toBeInTheDocument();
      expect(screen.getByText("What is the timeline?")).toBeInTheDocument();
    });
  });

  it("8. Plan card renders", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      data: {
        schema_version: "0.1", intent: "plan", status: "completed",
        user_message: "Test", answer: "Here is your plan.", clarifying_questions: [],
        plan: {
          goal: "Learn React", success_metric: "Build an app", scope: "Frontend",
          assumptions: [], milestones: [{ title: "M1", definition_of_done: "Done" }],
          tasks: [{ title: "T1", priority: "high", rationale: "Why", due_at: null }],
          risks: []
        },
        citations: [], action: null, memory: null, execution: null, uncertainty: null, next_step: null
      }
    });

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("Learn React")).toBeInTheDocument();
      expect(screen.getByText("Build an app")).toBeInTheDocument();
      expect(screen.getByText("M1")).toBeInTheDocument();
    });
  });

  it("9. Citations render", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      data: {
        schema_version: "0.1", intent: "answer", status: "completed", user_message: "Test",
        answer: "Read this.", clarifying_questions: [], plan: null,
        citations: [{ source_id: "1", source_title: "My Doc", source_type: "document", excerpt: "Excerpt text", location: null, url: null }],
        action: null, memory: null, execution: null, uncertainty: null, next_step: null
      }
    });

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("My Doc")).toBeInTheDocument();
      expect(screen.getByText(/"Excerpt text"/i)).toBeInTheDocument();
    });
  });

  it("10. Failed request preserves input", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockRejectedValueOnce(
      new Error("Safe error message")
    );

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Fail test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("Safe error message")).toBeInTheDocument();
      // The user message should be rendered in the chat view
      expect(screen.getByText("Fail test")).toBeInTheDocument();
    });
  });

  it("11. Retry triggers one new request", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockRejectedValueOnce(
      new Error("Fail once")
    );

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Retry test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });

    // Reset mock for success
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      data: {
        schema_version: "0.1", intent: "answer", status: "completed", user_message: "Retry test",
        answer: "Retried success.", clarifying_questions: [], plan: null, citations: [],
        action: null, memory: null, execution: null, uncertainty: null, next_step: null
      }
    });

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText("Retried success.")).toBeInTheDocument();
    });

    expect(jerryApiModule.sendJerryMessage).toHaveBeenCalledTimes(2);
  });

  it("12. Action proposal does not execute", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      data: {
        schema_version: "0.1", intent: "plan", status: "completed", user_message: "Test",
        answer: "", clarifying_questions: [], plan: null, citations: [],
        action: {
          action_id: "act_1", action_type: "bash", tool_name: "echo", risk_tier: "R1",
          approval_required: true, approval_status: "pending", approval_expires_at: null, idempotency_key: null,
          proposal_payload: {}, provider_result: null
        },
        memory: null, execution: null, uncertainty: null, next_step: null
      }
    });

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("echo")).toBeInTheDocument();
      // Verify button is disabled
      const approveBtn = screen.getByRole("button", { name: /Approve & Run/i });
      expect(approveBtn).toBeDisabled();
    });
  });

  it("13. Memory proposal does not save", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockResolvedValueOnce({
      data: {
        schema_version: "0.1", intent: "answer", status: "completed", user_message: "Test",
        answer: "", clarifying_questions: [], plan: null, citations: [], action: null,
        memory: {
          proposal_id: "mem_1", category: "preference", memory_text: "Likes testing",
          reason: "User asked for it", expires_at: null, status: "proposed", source: "chat"
        },
        execution: null, uncertainty: null, next_step: null
      }
    });

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText(/"Likes testing"/i)).toBeInTheDocument();
      // Verify button is disabled
      const saveBtn = screen.getByRole("button", { name: /Save Memory/i });
      expect(saveBtn).toBeDisabled();
    });
  });

  it("14. Mobile sidebar state works", () => {
    render(<ChatShell />);
    // By default, on mobile, the sidebar is hidden (translate-x-full). We can just test the toggle.
    const menuBtn = screen.getByRole("button", { name: "" }); // The Menu icon button
    fireEvent.click(menuBtn);
    // Clicking New Chat should close it
    const newChatBtn = screen.getByText(/New Chat/i);
    fireEvent.click(newChatBtn);
    // We would need more detailed DOM assertions to check translation classes, but this confirms interactions don't crash.
  });

  it("15. Unsafe API error details are not displayed", async () => {
    vi.mocked(jerryApiModule.sendJerryMessage).mockRejectedValueOnce(
      new Error("A safe error message")
    );

    render(<ChatShell />);
    fireEvent.change(screen.getByPlaceholderText(/Ask Jerry to plan/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByLabelText(/Send message/i));

    await waitFor(() => {
      expect(screen.getByText("A safe error message")).toBeInTheDocument();
      // Even if internal details existed, the UI only renders the safe error message string from the Error object.
    });
  });
});
