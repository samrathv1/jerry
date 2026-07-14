import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Fetch proposal to verify ownership
  const { data: proposal, error: fetchError } = await supabase
    .from("memory_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (fetchError || !proposal) return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404 });
  if (proposal.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  if (proposal.status !== "proposed") {
    return new Response(JSON.stringify({ error: "Proposal cannot be approved" }), { status: 400 });
  }

  const now = new Date();
  if (proposal.expires_at && new Date(proposal.expires_at) < now) {
    return new Response(JSON.stringify({ error: "Proposal has expired" }), { status: 400 });
  }

  // Check if sensitive/secret memory content (mock logic, in reality we'd scan)
  const contentStr = JSON.stringify(proposal.content).toLowerCase();
  if (contentStr.includes("password") || contentStr.includes("secret") || contentStr.includes("ssn")) {
    return new Response(JSON.stringify({ error: "Sensitive content rejected" }), { status: 400 });
  }

  // Use a transaction or conditional insert to ensure exactly one active memory
  // Here we just insert and update. Since duplicate approval must be idempotent, we check if it already exists.
  const { data: existingMemory } = await supabase
    .from("memories")
    .select("id")
    .eq("memory_proposal_id", proposal.id)
    .maybeSingle();

  if (!existingMemory) {
    const { error: memError } = await supabaseAdmin.from("memories").insert({
      memory_proposal_id: proposal.id,
      user_id: user.id,
      category: proposal.category,
      content: proposal.content,
      status: "active",
      expires_at: proposal.expires_at
    });
    if (memError) return new Response(JSON.stringify({ error: "Failed to create memory" }), { status: 500 });
  }

  // Mark proposal approved
  await supabase.from("memory_proposals").update({ status: "approved" }).eq("id", proposal.id);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
