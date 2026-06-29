import type { LiveMeta } from '@/types';

const EIGHT_HOURS = 8 * 3600;

const hash = (value: string) =>
  [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);

const pad = (n: number) => String(n).padStart(2, '0');

export const liveMetaFor = (id: string): LiveMeta => {
  const total = (hash(id) * 137) % EIGHT_HOURS;
  const elapsed = `${pad(Math.floor(total / 3600))}:${pad(
    Math.floor((total % 3600) / 60),
  )}:${pad(total % 60)}`;
  return { elapsed, day: (hash(id) % 3) + 1 };
};

export const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/** 1-based day count since the job was started (calendar days). */
export const dayNumberFor = (startedAt: string) => {
  const start = new Date(startedAt);
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  ).getTime();
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.max(1, Math.round((today - startDay) / 86_400_000) + 1);
};
