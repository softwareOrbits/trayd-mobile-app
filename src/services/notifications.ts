import { supabase } from './supabase';

export type NotificationItem = {
  id: string;
  notificationId: string;
  title: string;
  body: string;
  type: string | null;
  createdAt: string;
  read: boolean;
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
};

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
    .select('id, title, body, type')
    .in(
      'id',
      deduped.map(r => r.notification_id),
    );
  if (nErr) throw new Error(nErr.message);

  const byId = new Map<string, NotifRow>(
    ((notifs ?? []) as NotifRow[]).map(n => [n.id, n]),
  );

  const items: NotificationItem[] = deduped.map(r => {
    const n = byId.get(r.notification_id);
    return {
      id: r.id,
      notificationId: r.notification_id,
      title: n?.title ?? n?.type ?? 'Notification',
      body: n?.body ?? '',
      type: n?.type ?? null,
      createdAt: r.created_at,
      read: r.read_at != null,
    };
  });

  return { items, unread: items.filter(i => !i.read).length };
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw new Error(error.message);
}
