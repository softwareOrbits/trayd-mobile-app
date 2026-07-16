import { supabase } from './supabase';

export type NotificationItem = {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  type: string | null;
  createdAt: string;
  read: boolean;
  jobId: string | null;
  leaveId: string | null;
};

export type NotificationList = {
  items: NotificationItem[];
  unread: number;
};

export type NotificationTarget =
  | { screen: 'JobDetail'; jobId: string }
  | { screen: 'LeaveRequestDetail'; leaveId: string }
  | { screen: 'Leave' }
  | null;

export const isLeaveNotification = (type: string | null | undefined) =>
  !!type?.startsWith('leave_');

const TYPE_TITLES: Record<string, string> = {
  job_submitted: 'Job submitted for review',
  job_assigned: 'Job assigned',
  job_started: 'Job started',
  job_completed: 'Job completed',
  job_cancelled: 'Job cancelled',
  quote_approved: 'Quote approved',
  invoice_approved: 'Invoice approved',
  invoice_downloaded: 'Invoice downloaded',
  invoice_sent: 'Invoice sent',
  invoice_paid: 'Invoice paid',
  leave_requested: 'Leave requested',
  leave_approved: 'Leave approved',
  leave_declined: 'Leave declined',
  shift_reminder: 'Shift reminder',
  shift_force_stop: 'Shift ended',
};

const titleForType = (type: string | null | undefined) =>
  (type && TYPE_TITLES[type]) || 'Notification';

export const targetFor = (item: {
  type: string | null;
  jobId: string | null;
  leaveId: string | null;
}): NotificationTarget => {
  if (isLeaveNotification(item.type)) {
    return item.leaveId
      ? { screen: 'LeaveRequestDetail', leaveId: item.leaveId }
      : { screen: 'Leave' };
  }
  if (item.jobId) return { screen: 'JobDetail', jobId: item.jobId };
  return null;
};

type UserNotifRow = {
  id: string;
  notification_id: string;
  read_at: string | null;
  created_at: string;
};

type NotifRow = {
  id: string;
  title: string | null;
  body: string | null;
  type: string | null;
  related_entity_id: string | null;
  metadata: Record<string, unknown> | null;
};

type JobRow = {
  id: string;
  job_number: string | null;
  scheduled_date: string | null;
  finished_at: string | null;
  customers:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

const shortDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const customerNameOf = (job: JobRow): string | null => {
  const c = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  return c?.name?.trim() || null;
};

const metaString = (n: NotifRow | undefined, key: string): string | null => {
  const v = n?.metadata?.[key];
  return typeof v === 'string' && v ? v : null;
};

const jobIdOf = (n: NotifRow | undefined): string | null => {
  if (!n || isLeaveNotification(n.type)) return null;
  return n.related_entity_id ?? metaString(n, 'job_id');
};

const leaveIdOf = (n: NotifRow | undefined): string | null => {
  if (!n || !isLeaveNotification(n.type)) return null;
  return (
    n.related_entity_id ??
    metaString(n, 'leave_request_id') ??
    metaString(n, 'leave_id')
  );
};

async function loadJobsById(ids: string[]): Promise<Map<string, JobRow>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from('jobs')
    .select('id, job_number, scheduled_date, finished_at, customers(name)')
    .in('id', ids);
  return new Map(((data ?? []) as JobRow[]).map(j => [j.id, j]));
}

export async function listNotifications(limit = 30): Promise<NotificationList> {
  const { data: rows, error } = await supabase
    .from('user_notifications')
    .select('id, notification_id, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit * 2);
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const deduped: UserNotifRow[] = [];
  for (const r of (rows ?? []) as UserNotifRow[]) {
    if (seen.has(r.notification_id)) continue;
    seen.add(r.notification_id);
    deduped.push(r);
    if (deduped.length >= limit) break;
  }
  if (!deduped.length) return { items: [], unread: 0 };

  const { data: notifs, error: nErr } = await supabase
    .from('notifications')
    .select('id, title, body, type, related_entity_id, metadata')
    .in(
      'id',
      deduped.map(r => r.notification_id),
    );
  if (nErr) throw new Error(nErr.message);

  const byId = new Map<string, NotifRow>(
    ((notifs ?? []) as NotifRow[]).map(n => [n.id, n]),
  );

  const jobIds = [
    ...new Set(
      ((notifs ?? []) as NotifRow[])
        .map(jobIdOf)
        .filter((id): id is string => !!id),
    ),
  ];
  const jobsById = await loadJobsById(jobIds).catch(
    () => new Map<string, JobRow>(),
  );

  const items: NotificationItem[] = deduped.map(r => {
    const n = byId.get(r.notification_id);
    const jobId = jobIdOf(n);
    const job = jobId ? jobsById.get(jobId) : undefined;
    const customer = job ? customerNameOf(job) : null;

    let title = n?.title?.trim() || titleForType(n?.type);
    if (job && customer) {
      const when = shortDate(job.finished_at ?? job.scheduled_date ?? r.created_at);
      title = when ? `${customer} · ${when}` : customer;
    }

    return {
      id: r.id,
      notificationId: r.notification_id,
      title,
      body: n?.body ?? '',
      type: n?.type ?? null,
      createdAt: r.created_at,
      read: r.read_at != null,
      // Keep the id even when the job lookup failed (RLS, deleted row): without
      // it the row renders with no chevron and taps do nothing, which is what
      // "notifications are unclickable" meant.
      jobId,
      leaveId: leaveIdOf(n),
    };
  });

  return { items, unread: items.filter(i => !i.read).length };
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw new Error(error.message);
}
