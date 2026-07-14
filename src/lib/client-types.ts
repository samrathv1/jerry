import { JerryResponse } from "../ai/schemas/jerry-response.types";

export interface ClientChatMessage {
  id: string;
  role: "user" | "assistant";
  createdAt: string;
  content: string; // The text message from user or text answer from assistant
  requestId?: string | undefined;
  status: "sending" | "completed" | "failed";
  structuredResponse?: JerryResponse | undefined; // Only populated for assistant messages when successful
  errorMessage?: string | undefined; // Safe, user-facing error message
}
