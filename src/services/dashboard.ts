import { supabase } from './supabase';
import { offlineRead, readCached } from './readCache';
import type { JobStatus, JobType } from '@/types';

const CACHE_KEY = 'dashboard';

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

export type WeeklyTimesheet = {
  hours: number;
  targetHours: number;
  running: boolean;
};

export type DashboardJob = {
  jobId: string;
  jobNumber: string | null;
  jobType: JobType;
  status: JobStatus;
  customerName: string | null;
  customerAddress: string | null;
  customerEircode: string | null;
  scheduledStartTime: string | null;
  myHours: number;
  myRunning: boolean;
};

export type DashboardData = {
  jobsThisWeek: number;
  leave: { year: number; entitlement: number; used: number; left: number };
  hours: WeeklyTimesheet;
  today: DashboardJob[];
};

type DashboardPayload = {
  jobs_this_week: number;
  leave: { year: number; entitlement: number; used: number; left: number };
  hours: { worked: number; target: number; running: boolean };
  today: {
    job_id: string;
    job_number: string | null;
    job_type: string;
    status: string;
    customer_name: string | null;
    customer_address: string | null;
    customer_eircode: string | null;
    scheduled_start_time: string | null;
    my_hours: number | string | null;
    my_running: boolean;
  }[];
};

const mapPayload = (p: DashboardPayload): DashboardData => ({
  jobsThisWeek: p.jobs_this_week ?? 0,
  leave: p.leave ?? {
    year: new Date().getFullYear(),
    entitlement: 0,
    used: 0,
    left: 0,
  },
  hours: {
    hours: num(p.hours?.worked),
    targetHours: num(p.hours?.target) || 40,
    running: p.hours?.running === true,
  },
  today: (p.today ?? []).map(j => ({
    jobId: j.job_id,
    jobNumber: j.job_number,
    jobType: j.job_type as JobType,
    status: j.status as JobStatus,
    customerName: j.customer_name,
    customerAddress: j.customer_address,
    customerEircode: j.customer_eircode ?? null,
    scheduledStartTime: j.scheduled_start_time,
    myHours: num(j.my_hours),
    myRunning: j.my_running === true,
  })),
});

/**
 * Single round trip: hours, leave, job counts and today's list
 * (mds/dashboard-mobile.md). The last good payload is cached, so a lad on a site
 * with no signal still sees his jobs and hours instead of a wall of "—".
 */
export async function fetchDashboard(): Promise<DashboardData> {
  return offlineRead(CACHE_KEY, async () => {
    const { data, error } = await supabase.rpc('get_dashboard');
    if (error) throw new Error(error.message);
    return mapPayload(data as DashboardPayload);
  });
}

/** Last cached dashboard, or null if it has never loaded on this device. */
export function loadCachedDashboard(): Promise<DashboardData | null> {
  return readCached<DashboardData>(CACHE_KEY);
}
