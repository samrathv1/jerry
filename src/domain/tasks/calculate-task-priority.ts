import { Task } from "../schemas/tasks";
import { Goal } from "../schemas/goals";

/**
 * Calculates a deterministic priority score for a task.
 * Higher score = higher priority.
 * 
 * Factors:
 * - Overdue: +50
 * - Due Today: +30
 * - Priority: High (+20), Medium (+10), Low (+0)
 * - Blocked: -100
 * - In Progress: +5
 * - Goal Priority (if linked): High (+15), Medium (+5), Low (+0)
 * - Completed/Archived: -1000
 */
export function calculateTaskPriority(task: Task, linkedGoal?: Goal | null): number {
  if (task.status === "completed" || task.status === "archived") {
    return -1000;
  }

  if (task.status === "blocked") {
    return -100;
  }

  let score = 0;

  // Task Priority
  if (task.priority === "high") score += 20;
  else if (task.priority === "medium") score += 10;

  // Status
  if (task.status === "in_progress") {
    score += 5;
  }

  // Due Dates
  if (task.due_at) {
    const dueTime = new Date(task.due_at).getTime();
    const now = new Date().getTime();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    if (dueTime < now) {
      score += 50; // Overdue
    } else if (dueTime <= todayEnd.getTime()) {
      score += 30; // Due today
    }
  }

  // Linked Goal Priority
  if (linkedGoal) {
    if (linkedGoal.priority === "high") score += 15;
    else if (linkedGoal.priority === "medium") score += 5;
  }

  return score;
}

export function sortTasks(tasks: (Task & { goal?: Goal | null })[]): (Task & { goal?: Goal | null })[] {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateTaskPriority(a, a.goal);
    const scoreB = calculateTaskPriority(b, b.goal);
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // descending
    }

    // Tie breaker: Nearest due date first
    if (a.due_at && b.due_at) {
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    if (a.due_at) return -1;
    if (b.due_at) return 1;

    // Last tie breaker: updated_at descending
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}
