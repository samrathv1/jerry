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

  const { data: proposal, error: fetchError } = await supabase
    .from("memory_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (fetchError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  if (proposal.status !== "proposed") {
    return new Response(JSON.stringify({ error: "Proposal cannot be rejected" }), { status: 400 });
  }

  await supabase.from("memory_proposals").update({ status: "rejected" }).eq("id", proposal.id);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
