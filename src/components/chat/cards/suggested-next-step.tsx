import { JerryResponse } from "@/ai/schemas/jerry-response.types";

export function SuggestedNextStep({ nextStep }: { nextStep: NonNullable<JerryResponse["next_step"]> }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end text-sm">
      <span className="text-gray-500 mr-2">Next Step:</span>
      <span className="font-medium text-charcoal-700 bg-gray-100 px-3 py-1.5 rounded-full">
        {nextStep}
      </span>
    </div>
  );
}
