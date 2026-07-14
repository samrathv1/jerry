import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { ClarificationCard } from "./cards/clarification-card";
import { PlanCard } from "./cards/plan-card";

import { CitationList } from "./cards/citation-list";
import { ActionProposalCard } from "./cards/action-proposal-card";
import { MemoryProposalCard } from "./cards/memory-proposal-card";
import { ExecutionStatusCard } from "./cards/execution-status-card";
import { UncertaintyNotice } from "./cards/uncertainty-notice";
import { SuggestedNextStep } from "./cards/suggested-next-step";
import { Loader2 } from "lucide-react";

export function JerryMessage({
  response,
  status,
  conversationId
}: {
  response?: JerryResponse | undefined;
  status: "sending" | "completed" | "failed";
  conversationId?: string | undefined;
}) {
  if (status === "sending") {
    return (
      <div className="flex items-center gap-3 text-gray-500 my-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Jerry is thinking...</span>
      </div>
    );
  }

  if (!response) return null;

  return (
    <div className="w-full flex flex-col items-start overflow-hidden">
      {/* Answer Body */}
      {response.answer && (
        <div className="prose prose-sm prose-slate max-w-none text-charcoal-800 break-words w-full">
          {response.answer.split("\n").map((line: string, i: number) => (
            <p key={i} className="mb-2 last:mb-0">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Structured Cards */}
      {response.status === "needs_clarification" && response.clarifying_questions && (
        <ClarificationCard questions={response.clarifying_questions} />
      )}
      
      {response.plan && <PlanCard plan={response.plan} conversationId={conversationId} />}
      

      
      {response.citations && <CitationList citations={response.citations} />}
      
      {response.action && <ActionProposalCard action={response.action} />}
      
      {response.memory && <MemoryProposalCard memory={response.memory} />}
      
      {response.execution && <ExecutionStatusCard execution={response.execution} />}
      
      {response.uncertainty && <UncertaintyNotice uncertainty={response.uncertainty} />}
      
      {response.next_step && <SuggestedNextStep nextStep={response.next_step} />}
    </div>
  );
}
