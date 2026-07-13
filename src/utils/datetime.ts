const pad = (n: number) => `${n}`.padStart(2, '0');

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
