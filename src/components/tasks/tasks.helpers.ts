import { MONTHS_FULL } from '@/utils/constants';
import type { Task, TaskPeriod } from '@/types';

const SHIFT_TIME_ZONE = 'Europe/Dublin';

export const currentPeriod = (): TaskPeriod => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
};

export const periodLabel = (p: TaskPeriod): string =>
  `${MONTHS_FULL[p.month]} ${p.year}`;

export const inPeriod = (dateStr: string | null, p: TaskPeriod): boolean => {
  if (!dateStr) return false;
  const [y, m] = dateStr.split('-');
  return Number(y) === p.year && Number(m) - 1 === p.month;
};

export const dayHeaderLabel = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    .toUpperCase();

export const doneWhenLabel = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

export const completedSections = (
  tasks: Task[],
  period: TaskPeriod,
): { date: string; tasks: Task[] }[] => {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.status !== 'complete' || !inPeriod(task.deadlineDate, period)) {
      continue;
    }
    const key = task.deadlineDate as string;
    const bucket = map.get(key) ?? [];
    bucket.push(task);
    map.set(key, bucket);
  }
  return [...map.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date, tasks: map.get(date) ?? [] }));
};

export const irishToday = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: SHIFT_TIME_ZONE });

export const isOverdue = (task: Task, today = irishToday()): boolean => {
  if (task.status === 'complete' || !task.deadlineDate) return false;
  if (task.deadlineDate < today) return true;
  if (task.deadlineDate === today && task.deadlineTime) {
    const now = new Date().toLocaleTimeString('en-GB', {
      timeZone: SHIFT_TIME_ZONE,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    return task.deadlineTime < now;
  }
  return false;
};

export const deadlineLabel = (task: Task): string => {
  if (!task.deadlineDate) return 'No deadline';
  const date = new Date(`${task.deadlineDate}T00:00:00`);
  const today = new Date(`${irishToday()}T00:00:00`);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  const dm = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const day =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : date.toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });
  const base = diff === 0 || diff === 1 || diff === -1 ? `${day} · ${dm}` : day;
  return task.deadlineTime ? `${base} · ${task.deadlineTime}` : base;
};

export const deadlineTopLabel = (task: Task): string => {
  if (!task.deadlineDate) return 'No deadline';
  if (task.deadlineDate === irishToday()) {
    return task.deadlineTime ? `Today · before ${task.deadlineTime}` : 'Today';
  }
  return deadlineLabel(task);
};

export const locationLabel = (task: Task): string | null => {
  const address = task.address?.trim();
  if (address) return address.split(',')[0].trim();
  return task.eircode?.trim() || null;
};

export const vehicleLabel = (task: Task): string | null => {
  const v = task.vehicle;
  if (!v) return null;
  return v.registration || [v.make, v.model].filter(Boolean).join(' ') || null;
};
