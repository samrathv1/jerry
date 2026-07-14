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
    .from("memory_proposals")
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

  const { data: proposal, error: getError } = await supabase
    .from("memory_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (getError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  if (proposal.status === "rejected" || proposal.status === "expired") {
    return new Response(JSON.stringify({ error: "Cannot edit rejected or expired proposal" }), { status: 400 });
  }

  // Editing invalidates previous approval
  if (proposal.status === "approved") {
    // If it was already approved, editing makes it "edited" or "proposed" again.
    // Also, should probably delete the active memory or mark it deleted if it exists, or just leave it until new approval?
    // "edited proposals require fresh approval"
    await supabase.from("memories").update({ status: "deleted" }).eq("memory_proposal_id", proposal.id);
  }

  const { error: updError } = await supabase
    .from("memory_proposals")
    .update({ 
      content: body.content ?? proposal.content, 
      category: body.category ?? proposal.category,
      status: "proposed" // reset status to proposed
    })
    .eq("id", proposal.id);
    
  if (updError) return new Response(JSON.stringify({ error: "Failed to update" }), { status: 500 });
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
