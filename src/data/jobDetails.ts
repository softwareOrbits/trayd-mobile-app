import type { Job } from '@/types';

export type DetailState =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'awaiting_review'
  | 'approved';

export type RosterMember = { name: string; confirmed: boolean };
export type LineItemTag = 'VAN STOCK' | 'RECEIPT';
export type LineItem = { name: string; tag: LineItemTag; amount: string };
export type InfoEntry = { label: string; value: string };
export type DayEntry = { label: string; sub: string; active?: boolean };
export type PhotoTag = { label: string };

export type JobDetailMock = {
  state: DetailState;
  distanceKm: number;
  daySuffix: string;
  roster: RosterMember[];

  // scheduled
  note?: string;
  schedule?: InfoEntry[];
  rosterEditableNote?: string;

  // active
  timer?: string;
  loggedItems?: LineItem[];
  photos?: PhotoTag[];
  employerNote?: { time: string; text: string };

  // paused
  pausedSince?: string;
  pausedSummary?: string;
  days?: DayEntry[];

  // awaiting review
  readOnlyNote?: string;
  submitted?: InfoEntry[];
  summary?: string;

  // approved
  approvalLine?: string;
  approvalAt?: string;
  finalTotals?: InfoEntry[];
  approvedFootnote?: string;
};

/** Maps a Job's status/review to one of the five detail states. */
export const detailStateFor = (job: Job): DetailState => {
  switch (job.status) {
    case 'live':
      return 'active';
    case 'paused':
      return 'paused';
    case 'completed':
      return job.review === 'approved' ? 'approved' : 'awaiting_review';
    default:
      return 'scheduled';
  }
};

const SCHEDULED: Omit<JobDetailMock, 'state'> = {
  distanceKm: 12,
  daySuffix: 'day 2',
  note: 'Replace ball valve, check boiler pressure. Use 22mm, not 28.',
  schedule: [
    { label: 'Scheduled for', value: 'Thu 14 May · 14:00' },
    { label: 'Estimated', value: '2h 30m' },
    { label: 'Customer phone', value: '+353 87 444 1209' },
  ],
  roster: [
    { name: 'Ciarán (you)', confirmed: true },
    { name: 'Pádraig', confirmed: true },
    { name: 'Aoife', confirmed: false },
  ],
  rosterEditableNote:
    'Roster, job type & customer are still editable until you start.',
};

const ACTIVE: Omit<JobDetailMock, 'state'> = {
  distanceKm: 12,
  daySuffix: 'day 2',
  timer: '02:14:36',
  roster: [
    { name: 'Ciarán (you)', confirmed: true },
    { name: 'Pádraig', confirmed: true },
  ],
  loggedItems: [
    { name: 'Receipt · Heat Merchants', tag: 'RECEIPT', amount: '€52.40' },
    { name: 'Ball valve 22mm × 1', tag: 'VAN STOCK', amount: '€18.50' },
    { name: 'PTFE tape × 1', tag: 'VAN STOCK', amount: '€1.20' },
    { name: 'Copper pipe 15mm × 1m', tag: 'VAN STOCK', amount: '€3.80' },
  ],
  photos: [{ label: 'BEFORE' }, { label: 'MID' }, { label: 'MID' }],
  employerNote: {
    time: '11:42',
    text: 'Secondary leak found behind boiler — may need follow-up. Not charged today.',
  },
};

const PAUSED: Omit<JobDetailMock, 'state'> = {
  distanceKm: 12,
  daySuffix: 'day 2',
  pausedSince: 'WED 13 MAY · 17:20',
  pausedSummary: 'Day 1 · 6h 10m · €22.30',
  roster: [
    { name: 'Ciarán (you)', confirmed: true },
    { name: 'Pádraig', confirmed: true },
  ],
  days: [
    { label: 'Day 1 · Wed 13 May', sub: '6h 10m · Just you · €22.30' },
    { label: 'Day 2 · Resume today', sub: '–  ·  –  ·  –', active: true },
  ],
  loggedItems: [
    { name: 'Ball valve 22mm × 1', tag: 'VAN STOCK', amount: '€18.50' },
    { name: 'PTFE tape × 2', tag: 'VAN STOCK', amount: '€2.40' },
    { name: 'Copper elbow × 1', tag: 'VAN STOCK', amount: '€1.40' },
  ],
};

const AWAITING_REVIEW: Omit<JobDetailMock, 'state'> = {
  distanceKm: 12,
  daySuffix: 'day 2',
  roster: [],
  readOnlyNote: "Read-only — you'll get a push when Sile approves.",
  submitted: [
    { label: 'Total hours', value: '3h 40m' },
    { label: 'Crew', value: 'Just you' },
    { label: 'Materials total', value: '€42.10' },
    { label: 'Submitted at', value: '13 May · 14:02' },
  ],
  summary:
    'Replaced kitchen mixer tap, isolating valves cleaned, no leaks on test.',
};

const APPROVED: Omit<JobDetailMock, 'state'> = {
  distanceKm: 12,
  daySuffix: 'day 2',
  roster: [],
  approvalLine: 'Sile approved this invoice.',
  approvalAt: 'Mon 12 May · 17:48',
  finalTotals: [
    { label: 'Total hours', value: '2h 10m' },
    { label: 'Materials', value: '€18.50' },
    { label: 'Approved at', value: 'Mon 12 May · 17:48' },
  ],
  approvedFootnote:
    "The invoice itself stays with Sile. Payment status (downloaded · paid) isn't shown here.",
};

const BY_STATE: Record<DetailState, Omit<JobDetailMock, 'state'>> = {
  scheduled: SCHEDULED,
  active: ACTIVE,
  paused: PAUSED,
  awaiting_review: AWAITING_REVIEW,
  approved: APPROVED,
};

/** Rich mock content for the tapped job, keyed by its derived detail state. */
export const jobDetailMock = (job: Job): JobDetailMock => {
  const state = detailStateFor(job);
  return { state, ...BY_STATE[state] };
};
