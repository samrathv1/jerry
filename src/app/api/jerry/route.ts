import { NextResponse } from "next/server";
import { runJerry } from "@/ai/orchestrator/run-jerry";
import { JerryRuntimeContext } from "@/ai/orchestrator/jerry-runtime-context";
import {
  InvalidRequestError,
  PromptLoadFailedError,
  OpenAIRequestFailedError,
  EmptyModelOutputError,
  StructuredOutputFailedError,
  RepairFailedError,
  OrchestrationError,
} from "@/ai/orchestrator/orchestration-errors";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const requestId = randomUUID();

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Invalid request: 'message' string is required.", requestId },
        { status: 400 }
      );
    }

    if (!body.conversation_id) {
      return NextResponse.json(
        { error: "Invalid request: 'conversation_id' is required.", requestId },
        { status: 400 }
      );
    }

    const clientRequestId = body.request_id || requestId;

    // Verify conversation ownership
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", body.conversation_id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied.", requestId },
        { status: 404 }
      );
    }

    // Check for idempotency: if we already processed this request_id for the user
    const { data: existingMsg } = await supabase
      .from("messages")
      .select("id, structured_response")
      .eq("request_id", clientRequestId)
      .eq("role", "assistant")
      .single();

    if (existingMsg && existingMsg.structured_response) {
      return NextResponse.json(
        { data: existingMsg.structured_response, requestId: clientRequestId, cached: true },
        { status: 200 }
      );
    }

    // Fetch recent context (last 20 messages)
    const { data: rawMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", body.conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const recent_messages = (rawMessages || []).reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Store user message
    const { error: userMsgError } = await supabase.from("messages").insert({
      conversation_id: body.conversation_id,
      user_id: user.id,
      role: "user",
      content: body.message,
    });

    if (userMsgError) {
      throw new Error("Failed to store user message");
    }

    // Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", body.conversation_id);

    const runtimeContext: JerryRuntimeContext = {
      authenticated_user_id: user.id,
      current_datetime: new Date().toISOString(),
      user_timezone: "Asia/Kolkata",
      recent_messages,
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

    const response = await runJerry({
      userMessage: body.message,
      runtimeContext,
    });

    // Store assistant response
    const { error: asstMsgError } = await supabase.from("messages").insert({
      conversation_id: body.conversation_id,
      user_id: user.id,
      role: "assistant",
      content: response.answer || response.plan || response.clarifying_questions?.join("\n") || "No text provided.",
      structured_response: response as any,
      request_id: clientRequestId,
    });

    if (asstMsgError) {
      console.error("Failed to store assistant message", asstMsgError);
    }

    if (conversation.title === 'New Conversation') {
      try {
        const openai = new OpenAI();
        const titleResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant that summarizes a user message into a concise title (max 4-5 words) for a chat conversation. Do not use quotes." },
            { role: "user", content: body.message }
          ],
          max_tokens: 20
        });
        
        const newTitle = titleResponse.choices[0]?.message?.content?.trim();
        if (newTitle) {
          await supabase
            .from("conversations")
            .update({ title: newTitle.replace(/^["']|["']$/g, '') })
            .eq("id", body.conversation_id);
        }
      } catch (e) {
        console.error("Failed to generate title", e);
      }
    }

    // Store event
    await supabase.from("conversation_events").insert({
      conversation_id: body.conversation_id,
      user_id: user.id,
      type: "jerry_response",
      data: { intent: response.intent, status: response.status }
    });

    return NextResponse.json(
      { data: response, requestId: clientRequestId },
      { status: 200 }
    );
  } catch (error: unknown) {
    const isOrchestrationError = error instanceof OrchestrationError;
    const errorCode = isOrchestrationError ? error.code : "internal_error";
    
    console.error(`[RequestID: ${requestId}] Error: ${errorCode}`, {
      message: (error as Error).message,
      details: isOrchestrationError ? error.details : undefined,
    });

    if (error instanceof InvalidRequestError) {
      return NextResponse.json(
        { error: error.message, code: error.code, requestId },
        { status: 400 }
      );
    }

    if (
      error instanceof OpenAIRequestFailedError ||
      error instanceof EmptyModelOutputError ||
      error instanceof StructuredOutputFailedError ||
      error instanceof RepairFailedError ||
      error instanceof PromptLoadFailedError
    ) {
      return NextResponse.json(
        {
          error: "Model or orchestration failure occurred.",
          code: error.code,
          requestId,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error", code: "internal_server_error", requestId },
      { status: 500 }
    );
  }
}
