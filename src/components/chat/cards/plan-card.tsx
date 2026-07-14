"use client";

import { JerryResponse, Milestone, Task, Risk } from "@/ai/schemas/jerry-response.types";
import { CheckCircle2, Clock, ShieldAlert, Target, Loader2 } from "lucide-react";
import { useState } from "react";
import { ProposalConfirmationCard } from "./proposal-confirmation-card";

export function PlanCard({ plan, conversationId }: { plan: NonNullable<JerryResponse["plan"]>; conversationId?: string | undefined }) {
  const [isCreating, setIsCreating] = useState(false);
  const [proposalData, setProposalData] = useState<{ proposal: any, token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTasks = async () => {
    if (!plan.tasks || plan.tasks.length === 0) return;
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/internal-actions/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId || null,
          action_type: "create_tasks",
          payload: {
            goal_title: plan.goal,
            tasks: plan.tasks,
          }
        })
      });

      if (!res.ok) {
        throw new Error("Failed to create action proposal");
      }

      const data = await res.json();
      setProposalData({ proposal: data.proposal, token: data.confirmation_token });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  if (proposalData) {
    return (
      <ProposalConfirmationCard
        proposal={proposalData.proposal}
        confirmationToken={proposalData.token}
        onCancel={() => setProposalData(null)}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden my-4">
      <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <Target className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-800">{plan.goal}</h3>
      </div>
      
      <div className="p-5 space-y-6">
        {/* Success Metric & Scope */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Success Metric</span>
            <p className="text-gray-700">{plan.success_metric}</p>
          </div>
          <div>
            <span className="block text-gray-500 font-medium mb-1 text-xs uppercase tracking-wider">Scope</span>
            <p className="text-gray-700">{plan.scope}</p>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <span className="block text-gray-500 font-medium mb-3 text-xs uppercase tracking-wider">Milestones</span>
          <div className="space-y-3">
            {plan.milestones.map((milestone: Milestone, i: number) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                <h4 className="font-medium text-gray-800 flex items-center gap-2 mb-1">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{i + 1}</span>
                  {milestone.title}
                </h4>
                <p className="text-sm text-gray-600 pl-8">{milestone.definition_of_done}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <span className="block text-gray-500 font-medium mb-3 text-xs uppercase tracking-wider">Tasks</span>
          <ul className="space-y-3 mb-4">
            {plan.tasks.map((task: Task, j: number) => (
              <li key={j} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{task.title}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Priority: {task.priority}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{task.rationale}</p>
                  {task.due_at && <p className="text-xs text-gray-400 mt-1">Due: {task.due_at}</p>}
                </div>
              </li>
            ))}
          </ul>
          
          {plan.tasks.length > 0 && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleCreateTasks}
                disabled={isCreating}
                className="bg-charcoal-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create these tasks
              </button>
              {error && <span className="text-red-500 text-sm">{error}</span>}
            </div>
          )}
        </div>

        {/* Assumptions & Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {plan.assumptions && plan.assumptions.length > 0 && (
            <div>
              <span className="block text-gray-500 font-medium mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Assumptions
              </span>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {plan.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
          {plan.risks && plan.risks.length > 0 && (
            <div>
              <span className="block text-gray-500 font-medium mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Risks
              </span>
              <ul className="space-y-2">
                {plan.risks.map((r: Risk, i: number) => (
                  <li key={i} className="text-gray-600 bg-red-50/50 p-2 rounded text-xs border border-red-100">
                    <span className="block font-medium text-red-800">{r.risk}</span>
                    <span className="block text-gray-600 mt-1">Mitigation: {r.mitigation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
