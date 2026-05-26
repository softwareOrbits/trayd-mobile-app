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
