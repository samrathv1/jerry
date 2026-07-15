import { createClient } from "@/lib/supabase/server";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

export default async function MemoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-center text-zinc-400">Please sign in to view memories.</div>
      </WorkspaceLayout>
    );
  }

  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Memories</h1>
        <p className="text-zinc-400">View and manage your core memories.</p>
      </div>

      <div className="grid gap-4">
        {memories?.length === 0 ? (
          <div className="p-8 border border-zinc-800 rounded-xl text-center text-zinc-400 bg-zinc-900/30">
            No active memories found.
          </div>
        ) : (
          memories?.map((memory) => (
            <div key={memory.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 capitalize">
                  {memory.category.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
              </div>
              <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(memory.content, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  </WorkspaceLayout>
  );
}
