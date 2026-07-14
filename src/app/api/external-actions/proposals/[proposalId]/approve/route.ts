import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApprovalToken } from "@/lib/approval";

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

  // Fetch proposal to verify ownership and state
  const { data: proposal, error: fetchError } = await supabase
    .from("external_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (fetchError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  if (proposal.status !== "pending") {
    return new Response(JSON.stringify({ error: "Proposal cannot be approved" }), { status: 400 });
  }

  const now = new Date();
  if (proposal.expires_at && new Date(proposal.expires_at) < now) {
    return new Response(JSON.stringify({ error: "Proposal has expired" }), { status: 400 });
  }

  // Generate secure token
  try {
    const { token, hash } = await generateApprovalToken();
    const tokenExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minute TTL for approval token

    // Store hash only via Admin client since browser cannot insert approvals
    const { error: insertError } = await supabaseAdmin.from("external_action_approvals").insert({
      proposal_id: proposal.id,
      user_id: user.id,
      token_hash: hash,
      payload_hash: proposal.payload_hash,
      expires_at: tokenExpiry.toISOString(),
    });

    if (insertError) {
      throw new Error("DB Error");
    }

    // Mark proposal approved via Admin client as well or normal client (normal client has UPDATE policy)
    await supabase.from("external_action_proposals").update({ status: "approved" }).eq("id", proposal.id);

    return new Response(JSON.stringify({ approvalToken: token }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to generate approval" }), { status: 500 });
  }
}
