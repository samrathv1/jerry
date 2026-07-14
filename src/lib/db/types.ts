// src/lib/db/types.ts

/**
 * TypeScript type definitions for Phase 6 database tables.
 * These types mirror the schema defined in `supabase/migrations/00004_memory_action_centre.sql`.
 */

/** Common scalar types */
export type UUID = string; // UUID represented as string
export type Timestamp = string; // ISO 8601 timestamp

/** Enum definitions for status columns */
export enum MemoryProposalStatus {
  Proposed = "proposed",
  Approved = "approved",
  Edited = "edited",
  Rejected = "rejected",
  Expired = "expired",
  Deleted = "deleted",
}

export enum MemoryStatus {
  Active = "active",
  Expired = "expired",
  Deleted = "deleted",
}

export enum ExternalActionProposalStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Expired = "expired",
  Executing = "executing",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum ExternalActionExecutionStatus {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
}

export enum ConnectedAccountStatus {
  Connected = "connected",
  Revoked = "revoked",
}

/** Table: memory_proposals */
export interface MemoryProposal {
  id: UUID;
  user_id: UUID;
  category: "preference" | "communication_style" | "long_term_goal" | "recurring_workflow" | "project_context" | "professional_context" | "academic_context";
  content: Record<string, unknown>; // JSON payload stored in the column
  status: MemoryProposalStatus;
  expires_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Table: memories (active records) */
export interface Memory {
  id: UUID;
  memory_proposal_id: UUID; // reference to MemoryProposal
  user_id: UUID;
  category: string; // same enum values as MemoryProposal.category
  content: Record<string, unknown>;
  status: MemoryStatus;
  expires_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Table: external_action_proposals */
export interface ExternalActionProposal {
  id: UUID;
  user_id: UUID;
  provider: "google"; // currently only google is supported
  tool: "gmail_draft" | "calendar_event";
  action_type: string;
  risk_tier: string;
  payload: Record<string, unknown>;
  payload_hash: string; // SHA‑256 hash of the payload
  status: ExternalActionProposalStatus;
  expires_at?: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Table: external_action_approvals */
export interface ExternalActionApproval {
  id: UUID;
  proposal_id: UUID; // FK to ExternalActionProposal
  user_id: UUID;
  token_hash: string;
  payload_hash: string;
  expires_at: Timestamp;
  consumed_at?: Timestamp | null;
  revoked_at?: Timestamp | null;
  approved_at: Timestamp;
}

/** Table: external_action_executions */
export interface ExternalActionExecution {
  id: UUID;
  proposal_id: UUID; // FK to ExternalActionProposal
  execution_status: ExternalActionExecutionStatus;
  provider_response?: Record<string, unknown> | null;
  created_at: Timestamp;
}

/** Table: connected_accounts */
export interface ConnectedAccount {
  id: UUID;
  user_id: UUID;
  provider: string; // e.g., "google"
  provider_account_id: string;
  email?: string | null;
  scopes?: string[] | null;
  status: ConnectedAccountStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/** Export a union type for all tables – useful for generic helpers */
export type DBTable =
  | MemoryProposal
  | Memory
  | ExternalActionProposal
  | ExternalActionApproval
  | ExternalActionExecution
  | ConnectedAccount;
