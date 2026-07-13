import {
  STATUS_GROUP,
  type Job,
  type JobStatusGroup,
  type JobTabKey,
} from '@/types';

export const EMPTY_LABEL: Record<JobTabKey, string> = {
  scheduled: 'scheduled jobs',
  live: 'live jobs',
  resume: 'jobs to resume',
  done: 'completed jobs',
};

export const groupOf = (job: Job): JobStatusGroup | null =>
  STATUS_GROUP[job.status];

export const dateKey = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const weekBounds = (base: Date) => {
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateKey(start), end: dateKey(end) };
};

export const fmtSectionLabel = (date: string | null) => {
  if (!date) return 'Unscheduled';
  const value = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((value.getTime() - today.getTime()) / 86400000);
  const formatted = value.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (days === 0) return `Today · ${formatted}`;
  if (days === 1) return `Tomorrow · ${formatted}`;
  if (days === -1) return `Yesterday · ${formatted}`;
  return formatted;
};

export const buildDateSections = (jobs: Job[]) => {
  const byDate = new Map<string, Job[]>();
  jobs.forEach(job => {
    const key = job.scheduledDate ?? '';
    const bucket = byDate.get(key) ?? [];
    bucket.push(job);
    byDate.set(key, bucket);
  });
  return [...byDate.keys()].sort().map(date => ({
    title: fmtSectionLabel(date || null),
    data: byDate.get(date) ?? [],
  }));
};

export const liveSections = (active: Job[], paused: Job[]) =>
  [
    { title: 'Live', data: active },
    { title: 'Paused', data: paused },
  ].filter(s => s.data.length > 0);

export const weekdayLabel = (date: string | null) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
      })
    : '';
