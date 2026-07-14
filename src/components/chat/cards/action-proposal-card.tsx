import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { Wrench, ShieldAlert } from "lucide-react";

export function ActionProposalCard({ action }: { action: NonNullable<JerryResponse["action"]> }) {
  return (
    <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl overflow-hidden my-4">
      <div className="px-5 py-4 flex items-start gap-3 border-b border-slate-100">
        <div className="bg-blue-100 text-blue-700 p-2 rounded-lg shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-0.5 block">Proposed Action</span>
          <h3 className="font-semibold text-slate-800 text-base">{action.tool_name}</h3>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
            action.risk_tier === "R3" ? "bg-red-100 text-red-700" :
            action.risk_tier === "R2" ? "bg-orange-100 text-orange-700" :
            action.risk_tier === "R1" ? "bg-yellow-100 text-yellow-700" :
            "bg-green-100 text-green-700"
          }`}>
            Tier {action.risk_tier}
          </span>
          {action.approval_required && (
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Approval Required
            </span>
          )}
        </div>
      </div>
      <div className="p-5 text-sm text-slate-600">
        <p className="mb-4">
          This action prepares to execute <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 text-xs">{action.action_type}</code>.
        </p>
        
        <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-3 rounded-lg text-xs flex items-center justify-between">
          <span>Action execution will be enabled after authentication and approval storage are implemented.</span>
          <button disabled className="bg-slate-200 text-slate-400 px-3 py-1.5 rounded-md font-medium cursor-not-allowed">
            Approve & Run
          </button>
        </div>
      </div>
    </div>
  );
}
