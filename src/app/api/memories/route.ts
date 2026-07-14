import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const limitStr = url.searchParams.get("limit");
  const keyword = url.searchParams.get("keyword");

  const limit = limitStr ? parseInt(limitStr, 10) : 50;

  let query = supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });

  let memories = data || [];
  
  // Filter out expired memories
  const now = new Date();
  memories = memories.filter(m => !m.expires_at || new Date(m.expires_at) >= now);

  // Keyword relevance (basic substring match in JSON content)
  if (keyword) {
    const kw = keyword.toLowerCase();
    memories = memories.filter(m => JSON.stringify(m.content).toLowerCase().includes(kw));
  }

  // Apply maximum result count
  memories = memories.slice(0, limit);

  // Maximum character budget (e.g. 10000 chars total)
  let totalChars = 0;
  const budget = 10000;
  const budgetedMemories = [];
  
  for (const memory of memories) {
    const str = JSON.stringify(memory.content);
    if (totalChars + str.length > budget) break;
    totalChars += str.length;
    budgetedMemories.push(memory);
  }

  return new Response(JSON.stringify({ memories: budgetedMemories }), { status: 200 });
}
