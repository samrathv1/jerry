import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeTool } from "@/ai/tools/tool-registry";
import { z } from "zod";

// GET removed to [proposalId]/route.ts

const ConfirmProposalSchema = z.object({
  confirmation_token: z.string(),
  idempotency_key: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  // Check auth
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { proposalId } = await params;
  
  // URL matching to see if it's confirm or reject
  const isConfirm = req.url.endsWith("/confirm");
  const isReject = req.url.endsWith("/reject");

  if (isReject) {
     const { data, error } = await supabase
       .from("internal_action_proposals")
       .update({ status: "rejected", rejected_at: new Date().toISOString() })
       .eq("id", proposalId)
       .eq("user_id", user.id)
       .select()
       .single();
     if (error) return NextResponse.json({ error: "Database error" }, { status: 500 });
     return NextResponse.json({ success: true, proposal: data });
  }

  if (isConfirm) {
    try {
      const body = await req.json();
      const input = ConfirmProposalSchema.parse(body);

      // In a real environment, we would validate the hash inside the token. 
      // For this spec, we delegate to the create_internal_tasks tool logic to centralize R1 rules.
      
      const { data: proposal } = await supabase
         .from("internal_action_proposals")
         .select("action_type")
         .eq("id", proposalId)
         .eq("user_id", user.id)
         .single();
         
      if (!proposal) return NextResponse.json({ error: "Not Found" }, { status: 404 });

      // Only supporting create_tasks directly via AI tool for now
      if (proposal.action_type === "create_tasks") {
        const result = await executeTool("create_internal_tasks", {
           proposal_id: proposalId,
           confirmation_token: input.confirmation_token,
           idempotency_key: input.idempotency_key,
        }, {
           authenticated_user_id: user.id,
           user_timezone: "UTC" // fallback
        });

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
      }

      return NextResponse.json({ error: "Unsupported action_type" }, { status: 400 });

    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation Error", details: e.errors }, { status: 400 });
      }
      return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
