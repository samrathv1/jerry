import { JerryResponse } from "@/ai/schemas/jerry-response.types";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function ExecutionStatusCard({ execution }: { execution: NonNullable<JerryResponse["execution"]> }) {
  const isFailed = execution.state === "failed";
  const isCompleted = execution.state === "completed";

  return (
    <div className={`border shadow-sm rounded-xl overflow-hidden my-4 ${
      isFailed ? "bg-red-50 border-red-200" :
      isCompleted ? "bg-green-50 border-green-200" :
      "bg-blue-50 border-blue-200"
    }`}>
      <div className="px-5 py-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${
          isFailed ? "bg-red-100 text-red-700" :
          isCompleted ? "bg-green-100 text-green-700" :
          "bg-blue-100 text-blue-700"
        }`}>
          {isFailed ? <XCircle className="w-5 h-5" /> :
           isCompleted ? <CheckCircle className="w-5 h-5" /> :
           <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
        <div className="flex-1">
          <span className={`text-xs uppercase tracking-wider font-medium mb-0.5 block ${
            isFailed ? "text-red-600" :
            isCompleted ? "text-green-600" :
            "text-blue-600"
          }`}>
            Execution {execution.state}
          </span>
          <h3 className={`font-semibold text-base ${
            isFailed ? "text-red-900" :
            isCompleted ? "text-green-900" :
            "text-blue-900"
          }`}>
            {execution.execution_id || execution.execution_type}
          </h3>
        </div>
      </div>
      
      {execution.error_message && (
        <div className={`px-5 pb-5 pt-1 text-sm ${
          isFailed ? "text-red-800" :
          isCompleted ? "text-green-800" :
          "text-blue-800"
        }`}>
          <p>{execution.error_message}</p>
        </div>
      )}
    </div>
  );
}
