import { AlertCircle, RefreshCw } from "lucide-react";

interface ChatErrorStateProps {
  error?: string | undefined;
  onRetry?: () => void;
}

export function ChatErrorState({ error, onRetry }: ChatErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 my-2 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-medium text-red-800 mb-1">Jerry couldn&apos;t complete that request.</h4>
        <p className="text-sm text-red-700/80 mb-3">
          {error || "An unexpected error occurred. Your message has been preserved so you can retry."}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
