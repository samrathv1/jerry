import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to view activity.</div>;
  }

  const { data: executions } = await supabase
    .from("external_action_executions")
    .select(`
      id,
      execution_status,
      created_at,
      external_action_proposals!inner(
        user_id,
        provider,
        tool
      )
    `)
    .eq("external_action_proposals.user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-zinc-400">View history of external actions executed on your behalf.</p>
      </div>

      <div className="grid gap-4">
        {executions?.length === 0 ? (
          <div className="p-8 border border-zinc-800 rounded-xl text-center text-zinc-400 bg-zinc-900/30">
            No activity found.
          </div>
        ) : (
          executions?.map((exec: any) => (
            <Link 
              key={exec.id} 
              href={`/activity/${exec.id}`}
              className="block p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 hover:border-zinc-700 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-zinc-200 capitalize">
                    {exec.external_action_proposals.provider}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 uppercase tracking-wider">
                    {exec.external_action_proposals.tool.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                    exec.execution_status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    exec.execution_status === 'failed' ? 'bg-red-500/10 text-red-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {exec.execution_status}
                  </span>
                </div>
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(exec.created_at).toLocaleString()}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
