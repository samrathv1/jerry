import OpenAI from "openai";
import { JerryRuntimeContext } from "./jerry-runtime-context";
import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { safeValidateJerryResponse } from "@/ai/schemas/validate-jerry-response";
import { loadJerrySystemPrompt } from "@/ai/prompts/load-jerry-system-prompt";
import { runJerryAgent } from "./jerry-agent";
import { executeTool } from "../tools/tool-registry";
import {
  InvalidRequestError,
  PromptLoadFailedError,
  RepairFailedError,
} from "./orchestration-errors";

export interface RunJerryInput {
  userMessage: string;
  runtimeContext: JerryRuntimeContext;
}

const MAX_TURNS = 10;

export async function runJerry(input: RunJerryInput): Promise<JerryResponse> {
  if (!input.userMessage || input.userMessage.trim() === "") {
    throw new InvalidRequestError("User message cannot be empty.");
  }
  if (input.userMessage.length > 10000) {
    throw new InvalidRequestError("User message is too long.");
  }

  let systemPrompt: string;
  try {
    systemPrompt = loadJerrySystemPrompt();
  } catch (error: any) {
    throw new PromptLoadFailedError("Failed to load system prompt", error);
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `RUNTIME CONTEXT:\n${JSON.stringify(input.runtimeContext, null, 2)}`,
    },
    { role: "user", content: input.userMessage },
  ];

  let turn = 0;
  let lastParsedResponse: JerryResponse | null = null;
  let validationErrors: string[] = [];

  while (turn < MAX_TURNS) {
    turn++;
    
    // Inject repair messages if previous run resulted in validation errors
    if (validationErrors.length > 0 && lastParsedResponse) {
      messages.push({
        role: "assistant",
        content: JSON.stringify(lastParsedResponse),
      });
      messages.push({
        role: "user",
        content: `Your previous response failed validation. Please correct it. Errors:\n${validationErrors.join("\n")}`,
      });
      validationErrors = [];
    }

    const { parsed, toolCalls, message } = await runJerryAgent(messages);

    if (toolCalls && message) {
      messages.push(message);

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        try {
          const args = typeof call.function.arguments === 'string' 
            ? JSON.parse(call.function.arguments) 
            : call.function.arguments;
            
          const result = await executeTool(call.function.name, args, input.runtimeContext);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result)
          });
        } catch (e: any) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: e.message || "Tool execution failed" })
          });
        }
      }
      continue; // loop again with tool results
    }

    if (parsed) {
      const validation = safeValidateJerryResponse(parsed);
      if (validation.success) {
        return parsed; // success!
      } else {
        // If it's our first time failing validation, we allow ONE repair attempt loop.
        if (lastParsedResponse) {
            // we already tried a repair, so fail.
            throw new RepairFailedError("Repaired response failed validation", {
                originalErrors: validationErrors,
                repairErrors: validation.errors,
            });
        }
        lastParsedResponse = parsed;
        validationErrors = validation.errors || ["Unknown validation error"];
        continue;
      }
    }
  }

  throw new Error("Max turns reached in Jerry orchestration loop.");
}
