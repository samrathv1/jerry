import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { BrainCircuit } from "lucide-react";

export function MemoryProposalCard({ memory }: { memory: NonNullable<JerryResponse["memory"]> }) {
  return (
    <div className="bg-purple-50 border border-purple-200 shadow-sm rounded-xl overflow-hidden my-4">
      <div className="px-5 py-4 flex items-start gap-3 border-b border-purple-100">
        <div className="bg-purple-100 text-purple-700 p-2 rounded-lg shrink-0">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-purple-500 font-medium mb-0.5 block">Memory Proposal</span>
          <h3 className="font-semibold text-purple-900 text-base">{memory.category}</h3>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {memory.expires_at && (
            <span className="text-[10px] bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              Expires: {new Date(memory.expires_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 text-sm text-purple-800 space-y-3">
        <p className="font-medium text-lg leading-snug">&quot;{memory.memory_text}&quot;</p>
        <p className="text-purple-600 text-xs">Reason: {memory.reason}</p>
        
        <div className="mt-4 bg-purple-100/50 border border-purple-200 text-purple-800 p-3 rounded-lg text-xs flex items-center justify-between">
          <span>Memory controls will be enabled after account storage is implemented.</span>
          <button disabled className="bg-purple-200 text-purple-400 px-3 py-1.5 rounded-md font-medium cursor-not-allowed">
            Save Memory
          </button>
        </div>
      </div>
    </div>
  );
}
