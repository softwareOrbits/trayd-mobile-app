import { isHolidayKey } from '@/services/leave';
import type { LeaveRequest } from '@/types';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export const parseKey = (key: string | null | undefined) => {
  if (!key) return null;
  const d = new Date(`${key.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

export const todayKey = () => {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
};

export const mondayIndex = (jsDay: number) => (jsDay + 6) % 7;

export const countWorkingDays = (fromKey: string, toKeyStr: string) => {
  const start = parseKey(fromKey);
  const end = parseKey(toKeyStr);
  if (!start || !end) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (
      day !== 0 &&
      day !== 6 &&
      !isHolidayKey(toKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()))
    ) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export const formatDay = (key: string) => {
  const d = parseKey(key);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

export const formatShort = (key: string) => {
  const d = parseKey(key);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

const joinRange = (fromKey: string, toKeyStr: string, sep: string) => {
  const a = parseKey(fromKey);
  const b = parseKey(toKeyStr);
  if (!a || !b) return '';
  if (fromKey === toKeyStr) return formatDay(fromKey);
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(
    'en-GB',
    sameMonth
      ? { weekday: 'short', day: 'numeric' }
      : { weekday: 'short', day: 'numeric', month: 'short' },
  );
  return `${left} ${sep} ${formatDay(toKeyStr)}`;
};

export const formatRange = (fromKey: string, toKeyStr: string) =>
  joinRange(fromKey, toKeyStr, '–');

export const formatRangeArrow = (fromKey: string, toKeyStr: string) =>
  joinRange(fromKey, toKeyStr, '→');

export type LeaveGroupKey = 'pending' | 'upcoming' | 'past';

export const LEAVE_GROUP_LABEL: Record<LeaveGroupKey, string> = {
  pending: 'PENDING',
  upcoming: 'UPCOMING',
  past: 'PAST',
};

const groupForRequest = (r: LeaveRequest, today: string): LeaveGroupKey => {
  if (r.status === 'pending') return 'pending';
  if (r.status === 'approved' && r.endDate >= today) return 'upcoming';
  return 'past';
};

export const groupRequests = (requests: LeaveRequest[]) => {
  const today = todayKey();
  const buckets: Record<LeaveGroupKey, LeaveRequest[]> = {
    pending: [],
    upcoming: [],
    past: [],
  };
  requests.forEach(r => buckets[groupForRequest(r, today)].push(r));
  buckets.pending.sort((a, b) => a.startDate.localeCompare(b.startDate));
  buckets.upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  buckets.past.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (['pending', 'upcoming', 'past'] as LeaveGroupKey[])
    .map(key => ({ key, requests: buckets[key] }))
    .filter(g => g.requests.length > 0);
};
