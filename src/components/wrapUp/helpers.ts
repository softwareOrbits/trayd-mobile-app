export const WRAP_UP_TOTAL = 5;

export const SUMMARY_CHIPS = [
  'Tested under pressure',
  'No further leaks',
  'Customer happy on completion',
  'Follow-up needed',
];

export const two = (n: number) => String(n).padStart(2, '0');

export const fmtClock = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;

export const fmtMoney = (n: number) => `€${n.toFixed(2)}`;

export const fmtDateLong = (d: Date) =>
  d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function fmtHoursMinShort(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const diffLabelFor = (mins: number) =>
  mins === 0
    ? 'No change'
    : `${mins > 0 ? '+' : '−'}${fmtHoursMinShort(Math.abs(mins))}`;

export const fmtHoursMin = (h: number) => {
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) {
    hh += 1;
    mm = 0;
  }
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
};
