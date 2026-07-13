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
};

export type NotificationList = {
  items: NotificationItem[];
  unread: number;
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
        .map(
          n =>
            n.related_entity_id ??
            (typeof n.metadata?.job_id === 'string'
              ? (n.metadata.job_id as string)
              : null),
        )
        .filter((id): id is string => !!id),
    ),
  ];
  const jobsById = await loadJobsById(jobIds).catch(
    () => new Map<string, JobRow>(),
  );

  const items: NotificationItem[] = deduped.map(r => {
    const n = byId.get(r.notification_id);
    const jobId =
      n?.related_entity_id ??
      (typeof n?.metadata?.job_id === 'string'
        ? (n.metadata.job_id as string)
        : null);
    const job = jobId ? jobsById.get(jobId) : undefined;
    const customer = job ? customerNameOf(job) : null;

    let title = n?.title ?? n?.type ?? 'Notification';
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
