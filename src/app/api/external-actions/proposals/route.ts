// src/app/api/external-actions/proposals/route.ts
import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/approval";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const body = await request.json();
  const { provider, tool, action_type, risk_tier, payload, ttlMs = 10 * 60 * 1000 } = body;
  
  if (!provider || !tool || !action_type || !risk_tier || !payload) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  const payloadHash = await sha256Hex(JSON.stringify(payload));
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  const { data, error } = await supabase.from("external_action_proposals").insert({
    user_id: user.id,
    provider,
    tool,
    action_type,
    risk_tier,
    payload,
    payload_hash: payloadHash,
    status: "pending",
    expires_at: expiresAt,
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
    .from("external_action_proposals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  return new Response(JSON.stringify({ proposals: data }), { status: 200 });
}
