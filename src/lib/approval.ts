// src/lib/approval.ts

import { randomBytes, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";

/** Compute SHA‑256 hash of a string, return hex */
async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await global.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Create an opaque approval token and its hash */
export async function generateApprovalToken(): Promise<{ token: string; hash: string }> {
  const token = randomBytes(32).toString("base64url");
  const hash = await sha256Hex(token);
  return { token, hash };
}

/** Verify a token against stored hash (constant‑time) */
export async function verifyToken(token: string, storedHash: string): Promise<boolean> {
  const hash = await sha256Hex(token);
  // constant‑time compare using Buffer
  const tokenBuf = Buffer.from(hash);
  const storedBuf = Buffer.from(storedHash);
  if (tokenBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(tokenBuf, storedBuf);
}

/** Helper to get the current authenticated user */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  return { supabase, user };
}

/**
 * Store an approval token hash atomically in the external_action_approvals table.
 */
export async function storeApprovalHash({
  supabase,
  proposalId,
  userId,
  payloadHash,
  tokenHash,
  ttlMs,
}: {
  supabase: any;
  proposalId: string;
  userId: string;
  payloadHash: string;
  tokenHash: string;
  ttlMs: number;
}) {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  
  const { error } = await supabase
    .from("external_action_approvals")
    .insert({
      proposal_id: proposalId,
      user_id: userId,
      payload_hash: payloadHash,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    
  if (error) throw error;
}

/** Retrieve stored approval data */
export async function getStoredApproval(proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("external_action_approvals")
    .select("*")
    .eq("proposal_id", proposalId)
    .is("consumed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) throw error;
  return data ?? {};
}

export { sha256Hex };
