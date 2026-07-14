import { useRef, useEffect, useState } from "react";
import { SendHorizonal } from "lucide-react";

interface ChatComposerProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_CHARS = 10000;

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || disabled || trimmed.length > MAX_CHARS) return;
    onSend(trimmed);
    setContent("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Focus on mount and when re-enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const charsLeft = MAX_CHARS - content.length;
  const isNearLimit = charsLeft < 1000;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl p-2 relative flex flex-col focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-300 transition-all">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask Jerry to plan, explain, analyze, or help you decide..."
        className="w-full max-h-[200px] bg-transparent resize-none outline-none py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
        rows={1}
      />
      
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <div className="text-xs text-gray-400 font-medium">
          {isNearLimit && (
            <span className={isOverLimit ? "text-red-500" : "text-amber-500"}>
              {content.length} / {MAX_CHARS}
            </span>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={disabled || !content.trim() || isOverLimit}
          className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 disabled:text-gray-400 text-white p-2 rounded-xl transition-colors shrink-0"
          aria-label="Send message"
        >
          <SendHorizonal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
