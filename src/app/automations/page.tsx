'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { AutomationDefinition } from '@/domain/automations/types';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<AutomationDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    useEffect(() => {
        const fetchAutomations = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch('/api/automations');
                if (res.ok) {
                    const data = await res.json();
                    setAutomations(data);
                }
            } catch (err) {
                console.error('Failed to fetch automations', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAutomations();
    }, [router, supabase]);

    const toggleAutomation = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: newStatus } : a));
        try {
            await fetch(`/api/automations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newStatus })
            });
        } catch (err) {
            console.error('Failed to toggle automation', err);
            // revert on error
            setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: currentStatus } : a));
        }
    };

    if (loading) {
        return (
            <WorkspaceLayout>
                <div className="p-8 text-neutral-400">Loading automations...</div>
            </WorkspaceLayout>
        );
    }

    return (
        <WorkspaceLayout>
            <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-2">Automations</h1>
            <p className="text-neutral-400 mb-8">Manage proactive workflows and scheduled tasks.</p>

            {automations.length === 0 ? (
                <div className="p-6 border border-neutral-800 rounded-lg bg-neutral-900 text-neutral-400 text-center">
                    No automations configured yet. 
                </div>
            ) : (
                <div className="space-y-4">
                    {automations.map(automation => (
                        <div key={automation.id} className="p-6 border border-neutral-800 rounded-lg bg-neutral-900 flex justify-between items-center hover:border-neutral-700 transition-colors cursor-pointer" onClick={() => router.push(`/automations/${automation.id}`)}>
                            <div>
                                <h3 className="font-semibold text-lg">{automation.name}</h3>
                                <p className="text-sm text-neutral-400 mt-1 capitalize">{automation.type.replace('_', ' ')}</p>
                                {automation.schedule && (
                                    <p className="text-xs text-neutral-500 mt-2 font-mono">Schedule: {automation.schedule} ({automation.timezone})</p>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="text-sm text-right">
                                    <p className="text-neutral-400">Last run: {automation.last_run ? new Date(automation.last_run).toLocaleString() : 'Never'}</p>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleAutomation(automation.id, automation.enabled); }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${automation.enabled ? 'bg-blue-600' : 'bg-neutral-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${automation.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </WorkspaceLayout>
    );
}
