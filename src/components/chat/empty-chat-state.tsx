import { Bot } from "lucide-react";

interface EmptyChatStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  "Help me plan my week",
  "Help me prepare for an internship",
  "Analyze an important decision",
  "Turn my goal into actionable tasks"
];

export function EmptyChatState({ onSelectPrompt }: EmptyChatStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center max-w-2xl mx-auto py-12 md:py-24">
      <div className="bg-amber-100 text-amber-700 p-4 rounded-2xl mb-6 shadow-sm border border-amber-200/50">
        <Bot className="w-8 h-8" />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-semibold text-charcoal-800 mb-3">
        Hi, I&apos;m Jerry.
      </h2>
      <p className="text-gray-600 mb-10 max-w-md">
        Your personal AI operator. I can help you plan goals, analyze decisions, and safely prepare actions. How can I help today?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {STARTER_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left px-5 py-4 rounded-xl border border-gray-200 bg-white hover:border-amber-300 hover:shadow-sm hover:bg-amber-50/30 transition-all text-sm text-gray-700 font-medium group"
          >
            {prompt}
            <span className="block text-xs text-gray-400 font-normal mt-1 group-hover:text-amber-600/70 transition-colors">
              Click to send
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
