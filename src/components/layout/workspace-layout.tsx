"use client";

import { useState } from "react";
import { ChatSidebar } from "../chat/chat-sidebar";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const handleNewChat = () => {
    router.push("/chat");
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden text-charcoal-800 font-sans">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <div className={`fixed md:static inset-y-0 left-0 z-50 w-72 shrink-0 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <ChatSidebar onNewChat={handleNewChat} />
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b border-gray-200 flex items-center px-4 bg-white/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold ml-2">Jerry</span>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
