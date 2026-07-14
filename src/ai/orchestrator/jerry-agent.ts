import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { JerryResponseSchema } from "../schemas/jerry-response.schema";
import { JerryResponse } from "../schemas/jerry-response.types";
import { getToolDefinitions } from "../tools/tool-registry";
import {
  OpenAIRequestFailedError,
  EmptyModelOutputError,
  StructuredOutputFailedError,
} from "./orchestration-errors";

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function runJerryAgent(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<{ parsed?: JerryResponse; toolCalls?: OpenAI.Chat.ChatCompletionMessageToolCall[], message?: OpenAI.Chat.ChatCompletionMessage }> {
  const openai = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-2024-08-06";

  const tools = getToolDefinitions();

  let completion;
  try {
    completion = await openai.chat.completions.parse({
      model,
      messages,
      response_format: zodResponseFormat(JerryResponseSchema, "jerry_response"),
      ...(tools.length > 0 ? { tools: tools as any } : {}),
    });
  } catch (error: any) {
    throw new OpenAIRequestFailedError("OpenAI API request failed", error);
  }

  const choice = completion.choices[0];
  if (!choice) {
    throw new EmptyModelOutputError();
  }

  if (choice.message.refusal) {
    throw new StructuredOutputFailedError("Model refused to provide structured output", {
      refusal: choice.message.refusal,
    });
  }

  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    return { toolCalls: choice.message.tool_calls, message: choice.message };
  }

  if (!choice.message.parsed) {
    throw new StructuredOutputFailedError("Model failed to parse into the required schema");
  }

  return { parsed: choice.message.parsed as JerryResponse };
}
