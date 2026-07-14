import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { proposalId } = await params;
  if (!proposalId) return new Response(JSON.stringify({ error: "Missing proposal ID" }), { status: 400 });

  const { data, error } = await supabase
    .from("external_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (error || !data) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (data.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  return new Response(JSON.stringify(data), { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { proposalId } = await params;
  if (!proposalId) return new Response(JSON.stringify({ error: "Missing proposal ID" }), { status: 400 });

  const body = await request.json();
  // Only allow updating certain fields or maybe cancelling
  // The user requirement said PATCH is supported. Usually for cancelling or updating status to cancelled.

  const { data: proposal, error: getError } = await supabase
    .from("external_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (getError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  
  if (body.status === "cancelled" && (proposal.status === "pending" || proposal.status === "approved")) {
    const { error: updError } = await supabase
      .from("external_action_proposals")
      .update({ status: "cancelled" })
      .eq("id", proposal.id);
    if (updError) return new Response(JSON.stringify({ error: "Failed to update" }), { status: 500 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: "Invalid update" }), { status: 400 });
}
