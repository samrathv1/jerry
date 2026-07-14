import { describe, it, expect } from 'vitest';
import { calculateTaskPriority, sortTasks } from '@/domain/tasks/calculate-task-priority';
import { Task } from '@/domain/schemas/tasks';

describe("calculateTaskPriority", () => {
  it("returns -1000 for completed tasks", () => {
    const task = { status: "completed" } as Task;
    expect(calculateTaskPriority(task)).toBe(-1000);
  });

  it("adds 50 for overdue tasks", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const task = { status: "todo", due_at: past.toISOString(), priority: "low" } as Task;
    expect(calculateTaskPriority(task)).toBe(50);
  });

  it("prioritizes high priority over medium", () => {
    const t1 = { status: "todo", priority: "high" } as Task;
    const t2 = { status: "todo", priority: "medium" } as Task;
    expect(calculateTaskPriority(t1)).toBeGreaterThan(calculateTaskPriority(t2));
  });

  it("sorts correctly deterministically", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const future = new Date();
    future.setDate(future.getDate() + 1);

    const t1 = { id: "1", status: "todo", priority: "low", updated_at: new Date().toISOString() } as Task;
    const t2 = { id: "2", status: "todo", priority: "high", updated_at: new Date().toISOString() } as Task; // higher than t1
    const t3 = { id: "3", status: "todo", due_at: past.toISOString(), priority: "low", updated_at: new Date().toISOString() } as Task; // overdue, highest
    const t4 = { id: "4", status: "completed", priority: "high", updated_at: new Date().toISOString() } as Task; // lowest

    const sorted = sortTasks([t1, t2, t3, t4]);
    expect(sorted[0]!.id).toBe("3"); // overdue
    expect(sorted[1]!.id).toBe("2"); // high priority
    expect(sorted[2]!.id).toBe("1"); // normal
    expect(sorted[3]!.id).toBe("4"); // completed
  });
});
