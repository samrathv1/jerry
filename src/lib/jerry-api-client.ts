import { JerryResponse } from "../ai/schemas/jerry-response.types";

export interface JerryApiResponse {
  data?: JerryResponse;
  requestId?: string;
  error?: string;
  code?: string;
}

export class JerryClientError extends Error {
  constructor(message: string, public code?: string, public requestId?: string) {
    super(message);
    this.name = "JerryClientError";
  }
}

export async function sendJerryMessage(
  message: string,
  conversationId: string,
  requestId: string,
  abortController?: AbortController
): Promise<JerryApiResponse> {
  let response: Response;
  try {
    response = await fetch("/api/jerry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, conversation_id: conversationId, request_id: requestId }),
      signal: abortController?.signal ?? null,
    });
  } catch (_error: any) {
    if (_error.name === "AbortError") {
      throw new JerryClientError("Request was cancelled.");
    }
    // We already handled non-ok statuses with detailed error payloads above.
    // This catch block handles network failures or generic exceptions.
    throw new JerryClientError(_error.message || "Network error or unexpected failure.");
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new JerryClientError("Failed to parse the server response.", "invalid_json");
  }

  if (!response.ok) {
    // 400 or 502 returned a sanitized error message
    throw new JerryClientError(
      json.error || "An unexpected error occurred while processing your request.",
      json.code || "unknown_error",
      json.requestId
    );
  }

  if (!json.data) {
    throw new JerryClientError("The server response was missing the expected data payload.", "missing_data", json.requestId);
  }

  return {
    data: json.data,
    requestId: json.requestId,
  };
}
