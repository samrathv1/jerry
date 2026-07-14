"use client";

import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import Link from "next/link";
import { Goal } from "@/domain/schemas/goals";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(data => {
        setGoals(data || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-8 text-slate-500">Loading goals...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-800">Your Goals</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your long-term objectives.</p>
        </div>
        <button className="bg-charcoal-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-charcoal-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

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
  );
}
