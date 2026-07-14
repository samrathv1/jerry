import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  // If secure Vault storage is not verified, return not_configured
  // as per Phase 6 requirements.
  return new Response(JSON.stringify({ error: "not_configured", message: "Supabase Vault storage is not verified." }), { status: 501 });
}
