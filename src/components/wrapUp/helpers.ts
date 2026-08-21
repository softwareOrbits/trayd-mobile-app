import { fmtWeekdayDMY, pad } from '@/utils/datetime';
import { fmtMoney } from '@/utils/format';

export const WRAP_UP_TOTAL = 5;

export const SUMMARY_CHIPS = [
  'Tested under pressure',
  'No further leaks',
  'Customer happy on completion',
  'Follow-up needed',
];

export const two = pad;

export const fmtClock = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;

export { fmtMoney };

export const fmtDateLong = (d: Date) => fmtWeekdayDMY(d);

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
