import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateProposalSchema = z.object({
  conversation_id: z.string().uuid().nullable(),
  action_type: z.enum(["create_tasks", "create_goal", "update_task", "update_goal"]),
  payload: z.any(), // will be hashed
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const input = CreateProposalSchema.parse(body);

    const payloadString = JSON.stringify(input.payload);
    
    // create a simple hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payloadString));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const payloadHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    const { data, error } = await supabase
      .from("internal_action_proposals")
      .insert({
        user_id: user.id,
        conversation_id: input.conversation_id,
        action_type: input.action_type,
        payload: input.payload,
        payload_hash: payloadHash,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Proposals POST error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // We generate a pseudo confirmation token to be used on the client
    const confirmationToken = `token_${data.id}`;

    return NextResponse.json({
        proposal: data,
        confirmation_token: confirmationToken
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }
}
