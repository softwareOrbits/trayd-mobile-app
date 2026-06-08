import { supabase } from './supabase';
import { fetchMyMember } from './member';
import type { Job, JobDetail, JobStatus, JobType } from '@/types';

type ListRow = {
  id: string;
  job_number: string | null;
  job_type: string;
  status: string;
  raw_job_status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  primary_member_id: string | null;
  primary_member_name: string | null;
  invoice_total: number | string | null;
  last_activity_at: string | null;
  total_count: number;
};

type DetailRow = ListRow & {
  started_at: string | null;
  finished_at: string | null;
  employer_note: string | null;
  is_callout: boolean;
  total_hours: number | string | null;
  summary: string | null;
  created_by_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_eircode: string | null;
  primary_member_role: string | null;
};

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

const mapList = (r: ListRow): Job => ({
  id: r.id,
  jobNumber: r.job_number,
  jobType: r.job_type as JobType,
  status: r.status as JobStatus,
  rawStatus: r.raw_job_status,
  scheduledDate: r.scheduled_date,
  scheduledStartTime: r.scheduled_start_time,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  customerId: r.customer_id,
  customerName: r.customer_name,
  customerAddress: r.customer_address,
  primaryMemberId: r.primary_member_id,
  primaryMemberName: r.primary_member_name,
  invoiceTotal: num(r.invoice_total),
  lastActivityAt: r.last_activity_at,
});

const mapDetail = (r: DetailRow): JobDetail => ({
  id: r.id,
  jobNumber: r.job_number,
  jobType: r.job_type as JobType,
  status: r.status as JobStatus,
  rawStatus: r.raw_job_status,
  scheduledDate: r.scheduled_date,
  scheduledStartTime: r.scheduled_start_time,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  employerNote: r.employer_note,
  isCallout: r.is_callout,
  totalHours: r.total_hours == null ? null : num(r.total_hours),
  summary: r.summary,
  createdByName: r.created_by_name,
  customerId: r.customer_id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  customerEmail: r.customer_email,
  customerAddress: r.customer_address,
  customerEircode: r.customer_eircode,
  primaryMemberId: r.primary_member_id,
  primaryMemberName: r.primary_member_name,
  primaryMemberRole: r.primary_member_role,
  invoiceTotal: num(r.invoice_total),
});

/** Jobs where the signed-in employee is the primary assignee. */
export async function fetchMyJobs(): Promise<Job[]> {
  const me = await fetchMyMember();
  const { data, error } = await supabase.rpc('list_jobs', {
    p_tab: 'all',
    p_employee_id: me.id,
    p_limit: 100,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ListRow[]).map(mapList);
}

/** Full detail for a single job. */
export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const { data, error } = await supabase.rpc('get_job_detail', { p_id: id });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as DetailRow | undefined;
  if (!row) throw new Error('Job not found');
  return mapDetail(row);
}

/**
 * Transition a job's status (allowed for the employee via the `jobs_tenant`
 * RLS policy). NOTE: this is a bare status flip — proper side-effects on
 * start/finish (creating job_days / job_time_entries / invoices) will need a
 * dedicated backend RPC once the BE contract is confirmed.
 */
export async function updateJobStatus(
  id: string,
  status: JobStatus,
): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
