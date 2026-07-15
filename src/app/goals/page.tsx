"use client";

import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import Link from "next/link";
import { Goal } from "@/domain/schemas/goals";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(data => {
        setGoals(data || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          success_metric: successMetric || null,
          target_date: targetDate ? new Date(targetDate).toISOString() : null,
          priority,
          status: "active",
          progress: 0
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create goal");
      }

      const newGoal = await res.json();
      setGoals(prev => [newGoal, ...prev]);
      
      // Reset form & close modal
      setTitle("");
      setDescription("");
      setSuccessMetric("");
      setTargetDate("");
      setPriority("medium");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <WorkspaceLayout>
        <div className="p-8 text-slate-500">Loading goals...</div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-800">Your Goals</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your long-term objectives.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-charcoal-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-charcoal-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Goal Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800">Create New Goal</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-medium"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
              {formError && (
                <div className="text-xs bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-200">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Goal Title *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Learn Next.js"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea 
                  placeholder="What is this goal about?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Success Metric
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Complete 3 projects"
                  value={successMetric}
                  onChange={e => setSuccessMetric(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Target Date
                  </label>
                  <input 
                    type="date" 
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select 
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-charcoal-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200">
          <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-800 font-medium">No active goals</h3>
          <p className="text-slate-500 text-sm mt-1">Create a goal to start planning your tasks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <Link 
              href={`/goals/${goal.id}`} 
              key={goal.id}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <Target className="w-5 h-5 text-amber-600" />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                  goal.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {goal.status}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{goal.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{goal.description || "No description provided."}</p>
              
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span className="font-medium text-slate-700">{goal.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </WorkspaceLayout>
  );
}
