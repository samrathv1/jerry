"use client";

import { useState } from "react";
import { CheckCircle2, ShieldAlert, Loader2, Wrench } from "lucide-react";

interface ProposalConfirmationCardProps {
  proposal: any;
  confirmationToken: string;
  onCancel: () => void;
}

export function ProposalConfirmationCard({ proposal, confirmationToken, onCancel }: ProposalConfirmationCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const handleConfirm = async () => {
    setIsConfirming(true);
    setError(null);
    try {
      const res = await fetch(`/api/internal-actions/proposals/${proposal.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation_token: confirmationToken,
          idempotency_key: `confirm_${proposal.id}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm proposal");
      }
      
      setSuccessResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    try {
      await fetch(`/api/internal-actions/proposals/${proposal.id}/reject`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
    onCancel();
  };

  if (successResult) {
    return (
      <div className="bg-green-50 border border-green-200 shadow-sm rounded-xl overflow-hidden my-4 p-5">
        <div className="flex items-center gap-3 text-green-800">
          <CheckCircle2 className="w-5 h-5" />
          <h3 className="font-semibold text-base">Action Confirmed</h3>
        </div>
        <p className="text-sm text-green-700 mt-2">
          The requested action was successfully executed.
          {successResult.created_task_ids && ` Created ${successResult.created_task_ids.length} tasks.`}
        </p>
      </div>
    );
  }

  const tasks = proposal.payload.tasks || [];

  return (
    <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl overflow-hidden my-4">
      <div className="px-5 py-4 flex items-start gap-3 border-b border-slate-100">
        <div className="bg-blue-100 text-blue-700 p-2 rounded-lg shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-0.5 block">Action Proposal</span>
          <h3 className="font-semibold text-slate-800 text-base">Create {tasks.length} Tasks</h3>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Approval Required
          </span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="text-sm text-slate-700 mb-4 font-medium">Proposed tasks:</div>
        <ul className="space-y-2 mb-6 max-h-64 overflow-y-auto">
          {tasks.map((task: any, idx: number) => (
            <li key={idx} className="bg-white border border-slate-100 p-3 rounded-lg text-sm shadow-sm">
              <div className="font-medium text-slate-800">{task.title}</div>
              <div className="text-slate-500 text-xs mt-1">Priority: {task.priority}</div>
            </li>
          ))}
        </ul>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-100">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-charcoal-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm & Run
          </button>
          
          <button
            onClick={handleReject}
            disabled={isConfirming}
            className="text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
