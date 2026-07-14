import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { HelpCircle } from "lucide-react";

export function UncertaintyNotice({ uncertainty }: { uncertainty: NonNullable<JerryResponse["uncertainty"]> }) {
  if (uncertainty.unknowns.length === 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4 flex items-start gap-3">
      <HelpCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-orange-800 text-sm mb-1">Jerry is uncertain (Level: {uncertainty.level})</h4>
        <ul className="list-disc list-inside text-orange-700 text-sm space-y-1">
          {uncertainty.unknowns.map((unknown: string, i: number) => (
            <li key={i}>{unknown}</li>
          ))}
        </ul>
        {uncertainty.counterargument && (
          <p className="mt-2 text-orange-700 text-sm italic">
            Counterargument: {uncertainty.counterargument}
          </p>
        )}
      </div>
    </div>
  );
}
