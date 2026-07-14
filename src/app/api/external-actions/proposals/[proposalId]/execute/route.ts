import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256Hex } from "@/lib/approval";
import { executeGmailDraft } from "@/lib/providers/gmail";
import { executeCalendarEvent } from "@/lib/providers/calendar";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { proposalId } = await params;
  if (!proposalId) return new Response(JSON.stringify({ error: "Missing proposal ID" }), { status: 400 });

  const { token } = await request.json();
  if (!token) return new Response(JSON.stringify({ error: "Missing approval token" }), { status: 400 });

  const tokenHash = await sha256Hex(token);

  // Fetch proposal
  const { data: proposal, error: propError } = await supabase
    .from("external_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (propError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  if (proposal.status !== "approved") return new Response(JSON.stringify({ error: "Proposal not approved" }), { status: 400 });

  const now = new Date();
  if (proposal.expires_at && new Date(proposal.expires_at) < now) {
    return new Response(JSON.stringify({ error: "Proposal expired" }), { status: 400 });
  }

  // Compute payload hash to verify against stored approvals and proposals
  const currentPayloadHash = await sha256Hex(JSON.stringify(proposal.payload));

  // Atomically consume approval
  const { data: consumptionResult, error: approvalError } = await supabase.rpc("consume_external_action_approval", {
    p_proposal_id: proposal.id,
    p_token_hash: tokenHash,
    p_payload_hash: currentPayloadHash
  });

  if (approvalError || consumptionResult?.error) {
    return new Response(JSON.stringify({ error: consumptionResult?.error || "Invalid, expired, or already consumed approval" }), { status: 403 });
  }

  // Insert execution record as running via Admin Client
  const { data: execution, error: execError } = await supabaseAdmin
    .from("external_action_executions")
    .insert({
      proposal_id: proposal.id,
      execution_status: "running"
    })
    .select()
    .single();

  if (execError || !execution) {
    // Note: Due to unique constraint on proposal_id, this will also safely fail if another request inserted an execution
    return new Response(JSON.stringify({ error: "Failed to create execution record (perhaps execution already exists)" }), { status: 500 });
  }

  // Execute Provider Action
  let providerResponse = null;
  let executionStatus = "failed";

  try {
    if (proposal.provider === "google") {
      if (proposal.tool === "gmail_draft") {
        providerResponse = await executeGmailDraft(user.id, proposal.payload);
        executionStatus = "completed";
      } else if (proposal.tool === "calendar_event") {
        providerResponse = await executeCalendarEvent(user.id, proposal.payload);
        executionStatus = "completed";
      } else {
        throw new Error("Unknown tool");
      }
    } else {
      throw new Error("Unknown provider");
    }
  } catch (err: any) {
    providerResponse = { error: err.message || "Execution failed" };
  }

  // Update execution and proposal status
  await supabase
    .from("external_action_executions")
    .update({
      execution_status: executionStatus,
      provider_response: providerResponse
    })
    .eq("id", execution.id);

  await supabase
    .from("external_action_proposals")
    .update({ status: executionStatus })
    .eq("id", proposal.id);

  return new Response(JSON.stringify({ status: executionStatus, response: providerResponse }), { status: 200 });
}
