import { isHolidayKey } from '@/services/leave';
import {
  fmtDMY,
  fmtWeekdayDMY,
  pad,
  parseDateKey as parseKey,
  toDateKey as toKey,
} from '@/utils/datetime';
import type { LeaveRequest } from '@/types';

export { pad, parseKey, toKey };

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

export const formatDay = (key: string) => fmtWeekdayDMY(parseKey(key));

export const formatShort = (key: string) => fmtDMY(parseKey(key));

const joinRange = (fromKey: string, toKeyStr: string, sep: string) => {
  const a = parseKey(fromKey);
  const b = parseKey(toKeyStr);
  if (!a || !b) return '';
  if (fromKey === toKeyStr) return formatDay(fromKey);
  return `${fmtWeekdayDMY(a)} ${sep} ${fmtWeekdayDMY(b)}`;
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
