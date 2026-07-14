import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { proposalId } = await params;
  if (!proposalId) return new Response(JSON.stringify({ error: "Missing proposal ID" }), { status: 400 });

  // Verify ownership and status of proposal
  const { data: proposal, error: getError } = await supabase
    .from("external_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (getError || !proposal) {
    return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  }

  if (proposal.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  if (proposal.status !== "pending") {
    return new Response(JSON.stringify({ error: "Proposal is not pending" }), { status: 400 });
  }

  const { error: updError } = await supabase
    .from("external_action_proposals")
    .update({ status: "rejected" })
    .eq("id", proposal.id);

  if (updError) {
    return new Response(JSON.stringify({ error: "Failed to reject proposal" }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
