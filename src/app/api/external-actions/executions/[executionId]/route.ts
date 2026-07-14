import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { executionId } = await params;
  if (!executionId) return new Response(JSON.stringify({ error: "Missing execution ID" }), { status: 400 });

  const { data, error } = await supabase
    .from("external_action_executions")
    .select(`
      *,
      external_action_proposals (
        user_id,
        provider,
        tool,
        payload
      )
    `)
    .eq("id", executionId)
    .single();

  if (error || !data) return new Response(JSON.stringify({ error: "Execution not found" }), { status: 404 });
  
  // Verify ownership via proposal
  if ((data.external_action_proposals as any).user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}
