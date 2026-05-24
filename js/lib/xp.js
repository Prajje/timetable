export const XP_VALUES = Object.freeze({
  yolo: 10,
  power_up: 20,
  regular: 20,
  boss: 50
});

export function xpForTask(task) {
  if (!task.done) return 0;
  return XP_VALUES[task.type] ?? 0;
}

export function totalXpForTasks(tasks) {
  return tasks.reduce((s, t) => s + xpForTask(t), 0);
}
