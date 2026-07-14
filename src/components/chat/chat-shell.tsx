"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./chat-message";
import { EmptyChatState } from "./empty-chat-state";
import { ClientChatMessage } from "@/lib/client-types";
import { sendJerryMessage } from "@/lib/jerry-api-client";
import { Menu, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatShellProps {
  conversationId?: string;
}

export function ChatShell({ conversationId }: ChatShellProps) {
  const [messages, setMessages] = useState<ClientChatMessage[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(conversationId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(!!conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const isSending = messages.length > 0 && messages[messages.length - 1]?.status === "sending";

  const fetchHistory = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          createdAt: m.created_at,
          content: m.content,
          status: m.status,
          structuredResponse: m.structured_response,
          requestId: m.request_id,
        }));
        setMessages(formattedMessages);
      } else if (res.status === 404) {
        router.push("/chat"); // Invalid chat, go to new
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [conversationId, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async (content: string) => {
    // If no conversation exists yet, create one
    let targetConversationId = activeChatId;
    if (!targetConversationId) {
      try {
        const res = await fetch("/api/conversations", { method: "POST" });
        const newConv = await res.json();
        if (newConv.id) {
          targetConversationId = newConv.id;
          setActiveChatId(newConv.id);
          window.history.pushState(null, "", `/chat/${newConv.id}`);
        }
      } catch (e) {
        console.error("Failed to create conversation", e);
        return;
      }
    }

    if (!targetConversationId) return;

    const requestId = crypto.randomUUID();

    const userMessage: ClientChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      createdAt: new Date().toISOString(),
      content,
      status: "completed",
    };

    const assistantMessage: ClientChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: "",
      status: "sending",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const response = await sendJerryMessage(content, targetConversationId, requestId);
      
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === assistantMessage.id) {
          return {
            ...msg,
            status: "completed",
            structuredResponse: response.data,
            requestId: response.requestId || requestId,
          };
        }
        return msg;
      }));

      window.dispatchEvent(new Event('refresh-conversations'));
    } catch (error: any) {
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === assistantMessage.id) {
          return {
            ...msg,
            status: "failed",
            errorMessage: error?.message || String(error),
            requestId: error.requestId || requestId,
          };
        }
        return msg;
      }));
    }
  };

  const handleRetry = async (messageId: string) => {
    if (!activeChatId) return;
    
    const failedIndex = messages.findIndex((m) => m.id === messageId);
    if (failedIndex <= 0) return;
    
    const userMessage = messages[failedIndex - 1];
    if (!userMessage || userMessage.role !== "user") return;

    setMessages((prev) => prev.map((msg) => 
      msg.id === messageId ? { ...msg, status: "sending", errorMessage: undefined } : msg
    ));

    const requestId = crypto.randomUUID();

    try {
      const response = await sendJerryMessage(userMessage.content, activeChatId, requestId);
      
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            status: "completed",
            structuredResponse: response.data,
            requestId: response.requestId || requestId,
          };
        }
        return msg;
      }));
    } catch (error: any) {
      setMessages((prev) => prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            status: "failed",
            errorMessage: error?.message || String(error),
            requestId: error.requestId || requestId,
          };
        }
        return msg;
      }));
    }
  };

  const handleNewChat = () => {
    router.push("/chat");
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-white overflow-hidden text-charcoal-800 font-sans">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`fixed md:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <ChatSidebar activeConversationId={conversationId} onNewChat={handleNewChat} />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">
        <div className="md:hidden h-14 border-b border-gray-200 flex items-center px-4 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold ml-2">Jerry</span>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto w-full scroll-smooth"
        >
          {isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyChatState onSelectPrompt={handleSend} />
          ) : (
            <div className="pb-8">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} conversationId={activeChatId} onRetry={handleRetry} />
              ))}
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 lg:px-8 max-w-4xl mx-auto w-full">
          <ChatComposer onSend={handleSend} disabled={isSending || isLoadingHistory} />
          <div className="text-center mt-3">
            <span className="text-[11px] text-gray-400">
              Jerry may make mistakes. Always verify important decisions or plans.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
