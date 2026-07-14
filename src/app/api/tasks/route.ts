import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CreateTaskInputSchema } from "@/domain/schemas/tasks";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const goalId = searchParams.get("goal_id");

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });

  if (goalId) {
    query = query.eq("goal_id", goalId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const input = CreateTaskInputSchema.parse(body);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...input,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Tasks POST error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
  }
}
