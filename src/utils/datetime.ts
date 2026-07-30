export const pad = (n: number) => `${n}`.padStart(2, '0');

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

export const todayKey = () => dateKey(new Date());

export const parseDateKey = (key: string | null | undefined) => {
  if (!key) return null;
  const d = new Date(`${key.slice(0, 10)}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

export const formatStamp = (d: Date, withTime = false) => {
  const weekday = d
    .toLocaleDateString('en-GB', { weekday: 'long' })
    .toUpperCase();
  const dayMonth = d
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();
  const base = `${weekday} · ${dayMonth}`;
  if (!withTime) return base;
  return `${base} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

export const fmtHM = (hours: number) => {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${pad(m)}m`;
};

export const timeOf = (t: string | null | undefined) =>
  t ? t.slice(0, 5) : null;

export const fmtEventStamp = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const fmtDayShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const fmtDateWeekday = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export const fmtDateFull = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
