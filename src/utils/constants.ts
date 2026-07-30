import type { JobTypeOption } from '@/types';

export const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MONTHS_SHORT = MONTHS_FULL.map(m => m.slice(0, 3));

export const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const halfHourOptions = (fromHour: number, toHour: number): string[] => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const out: string[] = [];
  for (let h = fromHour; h < toHour; h += 1) {
    for (let m = 0; m < 60; m += 30) out.push(`${pad(h)}:${pad(m)}`);
  }
  return out;
};

export const HALF_HOUR_TIME_OPTIONS = halfHourOptions(6, 21);

export const ALL_DAY_TIME_OPTIONS = halfHourOptions(0, 24);


export const JOB_TYPE_OPTIONS: JobTypeOption[] = [
  {
    key: 'standard',
    icon: 'construct',
    title: 'Standard',
    subtitle: 'Most jobs — labour + materials.',
  },
  {
    key: 'quote',
    icon: 'document-text-outline',
    title: 'Quote visit',
    subtitle: 'No materials — site photos + notes only.',
  },
  {
    key: 'callout',
    icon: 'flame',
    title: 'Emergency call-out',
    subtitle: 'Logged the same — surcharge applied.',
  },
];
