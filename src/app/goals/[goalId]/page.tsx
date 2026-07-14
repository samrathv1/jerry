"use client";

import { useEffect, useState, use } from "react";
import { Target, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Goal } from "@/domain/schemas/goals";
import { Task } from "@/domain/schemas/tasks";

export default function GoalDetailPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = use(params);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/goals/${goalId}`).then(r => r.json()),
      fetch(`/api/tasks?goal_id=${goalId}`).then(r => r.json())
    ]).then(([goalData, tasksData]) => {
      setGoal(goalData);
      setTasks(tasksData || []);
      setIsLoading(false);
    });
  }, [goalId]);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "completed" ? "todo" : "completed";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const completeGoal = async () => {
    if (!goal) return;
    setGoal({ ...goal, status: "completed", progress: 100 });
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", progress: 100 })
    });
  };

  if (isLoading) return <div className="p-8">Loading goal...</div>;
  if (!goal) return <div className="p-8 text-red-500">Goal not found.</div>;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const totalTasks = tasks.length;
  const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : goal.progress;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/goals" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Goals
      </Link>
      
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-amber-600" />
              <h1 className="text-2xl font-semibold text-charcoal-800">{goal.title}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                goal.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {goal.status}
              </span>
            </div>
            <p className="text-slate-600">{goal.description || "No description."}</p>
          </div>
          
          <div className="flex gap-2">
            {goal.status !== "completed" && (
              <button onClick={completeGoal} className="text-sm bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-md hover:bg-green-100 font-medium transition-colors flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Complete
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <span className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1 block">Success Metric</span>
             <p className="text-slate-800">{goal.success_metric || "None"}</p>
           </div>
           <div>
             <span className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1 block">Target Date</span>
             <p className="text-slate-800">{goal.target_date ? new Date(goal.target_date).toLocaleDateString() : "No deadline"}</p>
           </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Associated Tasks</h2>
        <span className="text-sm text-slate-500">{completedTasks} of {totalTasks} completed ({computedProgress}%)</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
          No tasks planned for this goal yet.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4">
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
              <div>
                <h3 className={`font-medium ${task.status === "completed" ? "text-slate-500 line-through" : "text-slate-800"}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-slate-400">
                  <span className="uppercase tracking-wider font-medium text-slate-500">Priority: {task.priority}</span>
                  {task.due_at && <span>Due: {new Date(task.due_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
