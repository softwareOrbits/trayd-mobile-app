import { supabase } from './supabase';
import { getMyMemberRef } from './member';
import { LEAVE_TYPE_LABEL_LONG, type LeaveType } from '@/types';

export type TimesheetDay = {
  date: string;
  jobCount: number;
  totalHours: number;
  leave?: string;
};

export type Timesheet = {
  totalHours: number;
  running: boolean;
  days: TimesheetDay[];
};

type SegmentRow = {
  hours: number | string | null;
  start_time: string;
  finish_time: string | null;
  job_id: string;
  job_days: { work_date: string } | { work_date: string }[] | null;
};

const workDateOf = (r: SegmentRow): string => {
  const jd = Array.isArray(r.job_days) ? r.job_days[0] : r.job_days;
  return jd?.work_date ?? r.start_time.slice(0, 10);
};

const SYSTEM_CODES: readonly string[] = ['annual', 'sick', 'casual'];

const uiLeaveType = (code: string): LeaveType =>
  SYSTEM_CODES.includes(code) ? (code as LeaveType) : 'other';

type LeaveRequestRow = {
  start_date: string;
  end_date: string;
  leave_type_id: string;
};

type HolidayRow = {
  start_date: string;
  end_date: string;
  recurs_annually: boolean;
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const isHolidayKey = (key: string, holidays: HolidayRow[]) => {
  const md = key.slice(5);
  return holidays.some(h =>
    h.recurs_annually
      ? h.start_date.slice(5) <= md && md <= h.end_date.slice(5)
      : h.start_date <= key && key <= h.end_date,
  );
};

async function fetchLeaveByDay(
  memberId: string,
  fromKey: string,
  toKey: string,
): Promise<Map<string, LeaveType>> {
  const [reqsRes, holidaysRes, typesRes] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('start_date, end_date, leave_type_id')
      .eq('business_member_id', memberId)
      .eq('status', 'approved')
      .lte('start_date', toKey)
      .gte('end_date', fromKey),
    supabase
      .from('public_holidays')
      .select('start_date, end_date, recurs_annually'),
    supabase.from('leave_types').select('id, code'),
  ]);
  if (reqsRes.error) throw new Error(reqsRes.error.message);

  const holidays = (holidaysRes.data ?? []) as HolidayRow[];
  const codeById = new Map(
    ((typesRes.data ?? []) as { id: string; code: string }[]).map(t => [
      t.id,
      t.code,
    ]),
  );

  const byDay = new Map<string, LeaveType>();
  for (const r of (reqsRes.data ?? []) as LeaveRequestRow[]) {
    const type = uiLeaveType(codeById.get(r.leave_type_id) ?? '');
    const cursor = new Date(`${r.start_date}T00:00:00`);
    const end = new Date(`${r.end_date}T00:00:00`);
    for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = dayKey(cursor);
      if (key < fromKey || key >= toKey) continue;
      const dow = cursor.getDay();
      if (dow === 0 || dow === 6) continue;
      if (isHolidayKey(key, holidays)) continue;
      byDay.set(key, type);
    }
  }
  return byDay;
}

export async function fetchTimesheet(
  fromIso: string,
  toIso: string,
): Promise<Timesheet> {
  const me = await getMyMemberRef();
  const monthStart = new Date(fromIso);
  const fromKey = dayKey(new Date(monthStart.getFullYear(), monthStart.getMonth(), 1));
  const toKey = dayKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));

  const [entriesRes, leaveByDay] = await Promise.all([
    supabase
      .from('job_time_entries')
      .select('hours, start_time, finish_time, job_id, job_days(work_date)')
      .eq('business_member_id', me.id)
      .gte('start_time', fromIso)
      .lt('start_time', toIso)
      .order('start_time', { ascending: true }),
    fetchLeaveByDay(me.id, fromKey, toKey).catch(
      () => new Map<string, LeaveType>(),
    ),
  ]);
  const { data, error } = entriesRes;
  if (error) throw new Error(error.message);

  const now = Date.now();
  const byDate = new Map<string, { jobs: Set<string>; hours: number }>();
  let total = 0;
  let running = false;

  for (const r of (data ?? []) as SegmentRow[]) {
    const date = workDateOf(r);
    const open = r.finish_time == null;
    if (open) running = true;
    const h = open
      ? Math.max(0, (now - new Date(r.start_time).getTime()) / 3_600_000)
      : Number(r.hours ?? 0);
    total += h;

    const day = byDate.get(date) ?? { jobs: new Set<string>(), hours: 0 };
    day.jobs.add(r.job_id);
    day.hours += h;
    byDate.set(date, day);
  }

  const dates = new Set<string>([...byDate.keys(), ...leaveByDay.keys()]);
  const days: TimesheetDay[] = [...dates]
    .sort((a, b) => a.localeCompare(b))
    .map(date => {
      const worked = byDate.get(date);
      const leave = leaveByDay.get(date);
      return {
        date,
        jobCount: worked?.jobs.size ?? 0,
        totalHours: worked?.hours ?? 0,
        leave: leave ? LEAVE_TYPE_LABEL_LONG[leave] : undefined,
      };
    });

  return { totalHours: total, running, days };
}
