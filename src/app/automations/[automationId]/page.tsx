/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AutomationDefinition, AutomationRun } from '@/domain/automations/types';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';

export default function AutomationDetailPage({ params }: { params: Promise<{ automationId: string }> }) {
    const { automationId } = use(params);
    const [automation, setAutomation] = useState<AutomationDefinition | null>(null);
    const [runs, setRuns] = useState<AutomationRun[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    useEffect(() => {
        const fetchDetails = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            try {
                // Fetch automation def
                const { data: def, error: defErr } = await supabase
                    .from('automation_definitions')
                    .select('*')
                    .eq('id', automationId)
                    .single();
                
                if (defErr) throw defErr;
                setAutomation(def);

                // Fetch runs
                const { data: runData, error: runErr } = await supabase
                    .from('automation_runs')
                    .select('*')
                    .eq('definition_id', automationId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                
                if (runErr) throw runErr;
                setRuns(runData || []);

            } catch (err) {
                console.error('Failed to fetch details', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [automationId, router, supabase]);

    const toggleEnabled = async () => {
        if (!automation) return;
        const newStatus = !automation.enabled;
        setAutomation({ ...automation, enabled: newStatus });
        try {
            await fetch(`/api/automations/${automationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newStatus })
            });
        } catch (_err) {
            setAutomation({ ...automation, enabled: !newStatus });
        }
    };

    if (loading) {
        return (
            <WorkspaceLayout>
                <div className="p-8 text-neutral-400">Loading details...</div>
            </WorkspaceLayout>
        );
    }
    if (!automation) {
        return (
            <WorkspaceLayout>
                <div className="p-8 text-red-500">Automation not found.</div>
            </WorkspaceLayout>
        );
    }

    return (
        <WorkspaceLayout>
            <div className="max-w-4xl mx-auto p-8">
            <button onClick={() => router.push('/automations')} className="text-sm text-neutral-400 hover:text-white mb-6">
                &larr; Back to Automations
            </button>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold">{automation.name}</h1>
                    <p className="text-neutral-400 mt-1 capitalize">{automation.type.replace('_', ' ')}</p>
                </div>
                <button 
                    onClick={toggleEnabled}
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${automation.enabled ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    {automation.enabled ? 'Pause Automation' : 'Enable Automation'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 border border-neutral-800 rounded-lg bg-neutral-900">
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Configuration</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Schedule</span>
                            <span>{automation.schedule || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Timezone</span>
                            <span>{automation.timezone}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Last Run</span>
                            <span>{automation.last_run ? new Date(automation.last_run).toLocaleString() : 'Never'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Next Run</span>
                            <span>{automation.next_run ? new Date(automation.next_run).toLocaleString() : 'Not scheduled'}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border border-neutral-800 rounded-lg bg-neutral-900">
                    <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">Webhook Endpoint</h3>
                    <p className="text-xs text-neutral-500 mb-2">n8n triggers this endpoint to execute the workflow.</p>
                    <code className="block p-3 bg-black rounded border border-neutral-800 text-xs break-all">
                        POST /api/webhooks/n8n
                    </code>
                </div>
            </div>

            <h2 className="text-xl font-bold mb-4 border-b border-neutral-800 pb-2">Run History</h2>
            {runs.length === 0 ? (
                <p className="text-neutral-500 text-sm italic">No runs recorded yet.</p>
            ) : (
                <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-950 border-b border-neutral-800">
                            <tr>
                                <th className="p-4 font-semibold text-neutral-400">Time</th>
                                <th className="p-4 font-semibold text-neutral-400">Status</th>
                                <th className="p-4 font-semibold text-neutral-400">Idempotency Key</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {runs.map(run => (
                                <tr key={run.id} className="hover:bg-neutral-800/50 transition-colors">
                                    <td className="p-4 text-neutral-300">{new Date(run.created_at).toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            run.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                            run.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                            'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                            {run.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-neutral-500 font-mono text-xs">{run.idempotency_key}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </WorkspaceLayout>
    );
}
