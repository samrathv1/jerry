import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const body = await request.json();
  const { category, content, expires_at } = body;
  if (!category || !content) return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });

  // Do not generate tokens for memory proposals
  const { data, error } = await supabase.from("memory_proposals").insert({
    user_id: user.id,
    category,
    content,
    status: "proposed",
    expires_at,
  }).select("id").single();

  if (error) {
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }

  return new Response(JSON.stringify({ proposalId: data.id }), { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const { data, error } = await supabase
    .from("memory_proposals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  return new Response(JSON.stringify({ proposals: data }), { status: 200 });
}
