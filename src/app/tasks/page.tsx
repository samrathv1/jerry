"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, AlertCircle, Calendar } from "lucide-react";
import { Task } from "@/domain/schemas/tasks";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

type FilterType = "today" | "upcoming" | "overdue" | "high_priority" | "blocked" | "completed" | "all";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => setTasks(data || []))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const getFilteredTasks = () => {
    const now = new Date().getTime();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    return tasks.filter(t => {
      if (filter === "completed") return t.status === "completed";
      if (t.status === "completed") return false; // Hide completed in other views
      
      switch (filter) {
        case "today":
          return t.due_at && new Date(t.due_at).getTime() <= todayEnd.getTime() && new Date(t.due_at).getTime() >= now;
        case "upcoming":
          return t.due_at && new Date(t.due_at).getTime() > todayEnd.getTime();
        case "overdue":
          return t.due_at && new Date(t.due_at).getTime() < now;
        case "high_priority":
          return t.priority === "high";
        case "blocked":
          return t.status === "blocked";
        default:
          return true;
      }
    });
  };

  const filteredTasks = getFilteredTasks();

  if (isLoading) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-slate-500">Loading tasks...</div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="p-8 max-w-4xl mx-auto flex gap-8">
      {/* Sidebar Filters */}
      <div className="w-64 shrink-0">
        <h2 className="text-xl font-semibold text-charcoal-800 mb-6">Tasks</h2>
        <div className="space-y-1">
          {(["all", "today", "upcoming", "overdue", "high_priority", "blocked", "completed"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200">
             <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
             <h3 className="text-slate-800 font-medium">No tasks found</h3>
             <p className="text-slate-500 text-sm mt-1">Try changing your filters or asking Jerry to create some.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const isOverdue = task.due_at && new Date(task.due_at).getTime() < Date.now();
              return (
                <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4 shadow-sm hover:border-slate-300 transition-colors">
                  <button 
                    onClick={() => toggleTask(task)}
                    className="mt-0.5 shrink-0 text-slate-400 hover:text-amber-600 transition-colors"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-medium ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-slate-500 items-center">
                      <span className={`uppercase tracking-wider font-semibold ${
                        task.priority === 'high' ? 'text-red-600' : 
                        task.priority === 'medium' ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        Priority: {task.priority}
                      </span>
                      {task.due_at && (
                        <span className={`flex items-center gap-1 ${isOverdue && task.status !== 'completed' ? 'text-red-600 font-medium' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" /> 
                          {new Date(task.due_at).toLocaleDateString()}
                          {isOverdue && task.status !== 'completed' && " (Overdue)"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </WorkspaceLayout>
  );
}
