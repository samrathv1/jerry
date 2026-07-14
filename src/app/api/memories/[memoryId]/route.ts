import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { memoryId } = await params;
  if (!memoryId) return new Response(JSON.stringify({ error: "Missing memory ID" }), { status: 400 });

  const body = await request.json();

  const { data: memory, error: fetchError } = await supabase
    .from("memories")
    .select("*")
    .eq("id", memoryId)
    .single();

  if (fetchError || !memory) return new Response(JSON.stringify({ error: "Memory not found" }), { status: 404 });
  if (memory.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  if (memory.status === "deleted" || memory.status === "expired") {
    return new Response(JSON.stringify({ error: "Cannot edit deleted or expired memory" }), { status: 400 });
  }

  const { error: updError } = await supabase
    .from("memories")
    .update({ 
      content: body.content ?? memory.content,
      category: body.category ?? memory.category,
      updated_at: new Date().toISOString()
    })
    .eq("id", memory.id);
    
  if (updError) return new Response(JSON.stringify({ error: "Failed to update memory" }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { memoryId } = await params;
  if (!memoryId) return new Response(JSON.stringify({ error: "Missing memory ID" }), { status: 400 });

  const { data: memory, error: fetchError } = await supabase
    .from("memories")
    .select("*")
    .eq("id", memoryId)
    .single();

  if (fetchError || !memory) return new Response(JSON.stringify({ error: "Memory not found" }), { status: 404 });
  if (memory.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  // Soft delete by updating status
  const { error: updError } = await supabase
    .from("memories")
    .update({ status: "deleted" })
    .eq("id", memory.id);
    
  if (updError) return new Response(JSON.stringify({ error: "Failed to delete memory" }), { status: 500 });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
