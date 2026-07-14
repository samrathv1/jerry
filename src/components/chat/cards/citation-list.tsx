import { JerryResponse, Citation } from "@/ai/schemas/jerry-response.types";
import { Link2, FileText, Database } from "lucide-react";

export function CitationList({ citations }: { citations: NonNullable<JerryResponse["citations"]> }) {
  if (citations.length === 0) return null;

  return (
    <div className="my-4 space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sources</h4>
      <div className="flex flex-wrap gap-3">
        {citations.map((cit: Citation, idx: number) => (
          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm flex-1 min-w-[250px] max-w-sm">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h5 className="font-medium text-gray-800 line-clamp-1">{cit.source_title}</h5>
              {cit.source_type === "web" ? <Link2 className="w-4 h-4 text-gray-400 shrink-0" /> :
               cit.source_type === "document" ? <FileText className="w-4 h-4 text-gray-400 shrink-0" /> :
               <Database className="w-4 h-4 text-gray-400 shrink-0" />}
            </div>
            {cit.excerpt && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2 italic">
                &quot;{cit.excerpt}&quot;
              </p>
            )}
            {cit.url && (
              <a href={cit.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                View Source <Link2 className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
