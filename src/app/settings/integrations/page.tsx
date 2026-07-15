import { createClient } from "@/lib/supabase/server";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-center text-zinc-400">Please sign in to view integrations.</div>
      </WorkspaceLayout>
    );
  }

  const { data: accounts } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "connected");

  const googleAccount = accounts?.find(a => a.provider === "google");

  return (
    <WorkspaceLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-zinc-400">Manage your connected third-party accounts and permissions.</p>
      </div>

      <div className="space-y-6">
        <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/30 flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-zinc-200">Google Workspace</h2>
            <p className="text-sm text-zinc-400 max-w-lg">
              Allow Jerry to manage your Gmail drafts and Calendar events. 
              Only actions you explicitly approve will be executed.
            </p>
            {googleAccount && (
              <p className="text-xs text-emerald-400 mt-2 font-medium">
                Connected as {googleAccount.email}
              </p>
            )}
          </div>
          <div>
            {googleAccount ? (
              <button 
                disabled 
                className="px-4 py-2 bg-zinc-800 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed opacity-70"
              >
                Revoke Access
              </button>
            ) : (
              <button 
                disabled 
                className="px-4 py-2 bg-blue-600 text-blue-100 text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-not-allowed opacity-70"
                title="Google OAuth configuration is currently not fully configured in this environment."
              >
                Connect Google
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <h3 className="text-sm font-semibold text-yellow-500 mb-1">Configuration Status</h3>
          <p className="text-xs text-yellow-400/80">
            Secure Supabase Vault storage for OAuth tokens has not been verified yet. Real OAuth flows are currently disabled to ensure credentials are not stored insecurely.
          </p>
        </div>
      </div>
    </div>
  </WorkspaceLayout>
  );
}
