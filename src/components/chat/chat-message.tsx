import { ClientChatMessage } from "@/lib/client-types";
import { JerryMessage } from "./jerry-message";
import { ChatErrorState } from "./chat-error-state";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: ClientChatMessage;
  conversationId?: string | undefined;
  onRetry?: (id: string) => void;
}

export function ChatMessage({ message, conversationId, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`w-full py-6 flex justify-center ${isUser ? "bg-white" : "bg-gray-50/50"}`}>
      <div className="w-full max-w-3xl px-4 md:px-8 flex gap-4 md:gap-6">
        
        {/* Avatar */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-charcoal-800 text-white" : "bg-amber-100 text-amber-700"
        }`}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-800 mb-1">
            {isUser ? "You" : "Jerry"}
          </div>
          
          {isUser ? (
            <div className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : message.status === "failed" ? (
            <ChatErrorState error={message.errorMessage} onRetry={() => onRetry?.(message.id)} />
          ) : (
            <JerryMessage response={message.structuredResponse} status={message.status} conversationId={conversationId} />
          )}
        </div>

      </div>
    </div>
  );
}
