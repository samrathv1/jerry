import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

export default async function ExecutionDetailPage({ params }: { params: Promise<{ executionId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-center text-zinc-400">Please sign in to view activity details.</div>
      </WorkspaceLayout>
    );
  }

  const { executionId } = await params;
  
  const { data: exec } = await supabase
    .from("external_action_executions")
    .select(`
      *,
      external_action_proposals (
        user_id,
        provider,
        tool,
        action_type,
        risk_tier,
        payload
      )
    `)
    .eq("id", executionId)
    .single();

  if (!exec || (exec.external_action_proposals as any).user_id !== user.id) {
    notFound();
  }

  const proposal = exec.external_action_proposals as any;

  return (
    <WorkspaceLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <Link href="/activity" className="text-sm text-zinc-400 hover:text-zinc-300 mb-4 inline-block">
          &larr; Back to Activity
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight capitalize">{proposal.provider} Action</h1>
            <p className="text-zinc-400 mt-1 uppercase text-xs tracking-wider font-medium">{proposal.tool.replace(/_/g, " ")}</p>
          </div>
          <span className={`px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wider ${
            exec.execution_status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
            exec.execution_status === 'failed' ? 'bg-red-500/10 text-red-400' :
            'bg-yellow-500/10 text-yellow-400'
          }`}>
            {exec.execution_status}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Execution Metadata</h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500 mb-1">Execution ID</div>
              <div className="text-zinc-300 font-mono text-xs">{exec.id}</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Executed At</div>
              <div className="text-zinc-300">{new Date(exec.created_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Risk Tier</div>
              <div className="text-zinc-300 capitalize">{proposal.risk_tier}</div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Action Type</div>
              <div className="text-zinc-300 capitalize">{proposal.action_type.replace(/_/g, " ")}</div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Proposal Payload</h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-auto">
            <pre className="text-xs text-zinc-300 font-mono">
              {JSON.stringify(proposal.payload, null, 2)}
            </pre>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-300">Provider Response</h2>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-auto">
            <pre className="text-xs text-zinc-300 font-mono">
              {JSON.stringify(exec.provider_response, null, 2)}
            </pre>
          </div>
        </section>
      </div>
    </div>
  </WorkspaceLayout>
  );
}
