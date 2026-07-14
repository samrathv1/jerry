import { JerryResponse } from "@/ai/schemas/jerry-response.types";

export function ClarificationCard({ questions }: { questions: NonNullable<JerryResponse["clarifying_questions"]> }) {
  if (questions.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-4">
      <h3 className="text-amber-800 font-semibold mb-3 text-sm tracking-wide uppercase">Clarification Needed</h3>
      <ol className="list-decimal list-inside space-y-2 text-charcoal-800 text-sm">
        {questions.map((q: string, idx: number) => (
          <li key={idx} className="pl-1 leading-relaxed">
            {q}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-amber-700/80">
        You can answer these below.
      </p>
    </div>
  );
}
