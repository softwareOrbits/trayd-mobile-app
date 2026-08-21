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

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const d =
    value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Every date in the app reads day/month/year — 09/08/2026. */
export const fmtDMY = (value: Date | string | null | undefined): string => {
  const d = asDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
};

export const weekdayShort = (value: Date | string | null | undefined): string => {
  const d = asDate(value);
  return d ? d.toLocaleDateString('en-GB', { weekday: 'short' }) : '';
};

/** 'Fri 09/08/2026' */
export const fmtWeekdayDMY = (
  value: Date | string | null | undefined,
): string => {
  const d = asDate(value);
  return d ? `${weekdayShort(d)} ${fmtDMY(d)}` : '';
};

export const formatStamp = (d: Date, withTime = false) => {
  const weekday = d
    .toLocaleDateString('en-GB', { weekday: 'long' })
    .toUpperCase();
  const base = `${weekday} · ${fmtDMY(d)}`;
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

export const fmtEventStamp = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${fmtWeekdayDMY(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtDayShort = (iso: string) => fmtDMY(iso);

export const fmtDateWeekday = (iso: string) => fmtWeekdayDMY(iso);

export const fmtDateFull = (iso?: string | null): string | null => {
  if (!iso) return null;
  return fmtDMY(iso) || iso;
};
