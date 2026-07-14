export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JerryRuntimeContext {
  authenticated_user_id: string;
  current_datetime: string;
  user_timezone: string;
  recent_messages: unknown[];
  conversation_summary: string | null;
  available_tools: never[]; // Enforced empty array for this phase
  approved_memories: unknown[]; // May be empty
  profile_and_preferences: JsonValue | null;
  goals_and_tasks: JsonValue | null;
  retrieved_chunks: unknown[]; // May be empty
  approval_context: JsonValue | null; // Must be null for this phase
  existing_action_or_execution_id: string | null; // May be null
  prompt_version: string;
}
