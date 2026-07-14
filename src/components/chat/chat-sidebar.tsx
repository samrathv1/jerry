"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Target, CheckSquare, BookOpen, BrainCircuit, Activity, Bot, Plus, Trash2, Loader2, LogOut, PlaySquare } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ChatSidebarProps {
  onNewChat: () => void;
  activeConversationId?: string | undefined;
}

interface Conversation {
  id: string;
  title: string;
  status: string;
  last_message_at: string;
}

const NAV_ITEMS = [
  { name: "Chat", icon: MessageSquare, href: "/chat" },
  { name: "Goals", icon: Target, href: "/goals" },
  { name: "Tasks", icon: CheckSquare, href: "/tasks" },
  { name: "Knowledge", icon: BookOpen, href: "/knowledge" },
  { name: "Memories", icon: BrainCircuit, href: "/memories" },
  { name: "Activity", icon: Activity, href: "/activity" },
  { name: "Automations", icon: PlaySquare, href: "/automations" },
];

export function ChatSidebar({ onNewChat, activeConversationId }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (e) {
      console.error("Failed to fetch conversations", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    
    // Listen for custom event from ChatShell to refresh list after new messages
    const handleRefresh = () => fetchConversations();
    window.addEventListener("refresh-conversations", handleRefresh);
    return () => window.removeEventListener("refresh-conversations", handleRefresh);
  }, [fetchConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      try {
        await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          router.push("/chat");
        }
      } catch (err) {
        console.error("Failed to delete", err);
      }
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="w-full h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200/60">
        <div className="flex items-center gap-3">
          <div className="bg-amber-600 text-white p-1.5 rounded-lg shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-semibold text-charcoal-800 text-lg tracking-tight">Jerry</span>
        </div>
      </div>

      {/* New Chat Action */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-white border border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 text-gray-800 font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm"
        >
          <Plus className="w-4 h-4 text-gray-500" />
          New Chat
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
          Recent Chats
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        ) : (
          conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeConversationId === conv.id
                  ? "bg-white text-amber-700 shadow-sm border border-gray-200/50" 
                  : "text-gray-600 hover:bg-gray-100 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{conv.title}</span>
              </div>
              <button 
                onClick={(e) => handleDelete(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500 transition-all shrink-0"
                title="Delete chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </Link>
          ))
        )}

        <div className="mt-8 mb-3 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Workspace
        </div>
        {NAV_ITEMS.slice(1).map((item) => {

          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-amber-700 shadow-sm border border-gray-200/50" 
                  : "text-gray-600 hover:bg-gray-100 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer Note */}
      <div className="p-4 border-t border-gray-200/60 bg-gray-100/50">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full px-2 py-1.5 rounded-lg hover:bg-gray-200/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
