import type { IconName } from './theme';

export type JobTypeOption = {
  key: 'standard' | 'quote' | 'callout';
  icon: IconName;
  title: string;
  subtitle: string;
};

export type JobStatus =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'awaiting_review'
  | 'approved'
  | 'downloaded'
  | 'paid'
  | 'cancelled';

export type JobType = 'standard' | 'multi_day' | 'quote' | 'callout';

export type JobTabKey = 'scheduled' | 'live' | 'resume' | 'done';

/** Coarse bucket a status falls into, before the date-based tab split. */
export type JobStatusGroup = 'upcoming' | 'live' | 'paused' | 'done';

/** One row from the `list_jobs` RPC. */
export type Job = {
  id: string;
  jobNumber: string | null;
  jobType: JobType;
  status: JobStatus;
  rawStatus: string;
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  customerName: string | null;
  customerAddress: string | null;
  primaryMemberId: string | null;
  primaryMemberName: string | null;
  invoiceTotal: number;
  lastActivityAt: string | null;
};

/** The richer `get_job_detail` RPC row. */
export type JobDetail = {
  id: string;
  jobNumber: string | null;
  jobType: JobType;
  status: JobStatus;
  rawStatus: string;
  scheduledDate: string | null;
  scheduledStartTime: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  employerNote: string | null;
  isCallout: boolean;
  totalHours: number | null;
  summary: string | null;
  createdById: string | null;
  createdByName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  customerEircode: string | null;
  primaryMemberId: string | null;
  primaryMemberName: string | null;
  primaryMemberRole: string | null;
  invoiceTotal: number;
};

/** Which group a status belongs to (null = hidden, e.g. cancelled). The
 * `upcoming` group is split into the Today / This Week tabs by scheduled date,
 * and `live`/`paused` map to the Live / Resume tabs. */
export const STATUS_GROUP: Record<JobStatus, JobStatusGroup | null> = {
  scheduled: 'upcoming',
  active: 'live',
  paused: 'paused',
  awaiting_review: 'done',
  approved: 'done',
  downloaded: 'done',
  paid: 'done',
  cancelled: null,
};

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  standard: 'Standard',
  multi_day: 'Multi-day',
  quote: 'Quote',
  callout: 'Emergency',
};

export type JobsStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type JobsState = {
  items: Job[];
  status: JobsStatus;
  error: string | null;
};

export type LiveState = 'active' | 'paused';

export type LiveMeta = {
  elapsed: string;
  day: number;
};

export type JobTabItem = {
  key: JobTabKey;
  label: string;
  icon: IconName;
  count: number;
};

export type JobTabsProps = {
  tabs: JobTabItem[];
  activeKey: JobTabKey;
  onChange: (key: JobTabKey) => void;
};

export type JobItemProps = {
  job: Job;
  onPress?: () => void;
  onLongPress?: () => void;
  onStart?: () => void;
  onTimer?: () => void;
};

/**
 * My own clock on a job, which is independent of `jobs.status`: the crew can be
 * active while I'm on a break, and I can be working a job the crew has paused.
 */
export type MyJobState = 'working' | 'paused' | 'not_started';

export type LiveJobItemProps = {
  job: Job;
  elapsed: string;
  day: number;
  myState: MyJobState;
  /** Crew members with an open segment right now — me included. */
  onSite: number;
  onPress?: () => void;
  onChat?: () => void;
  onTimer?: () => void;
};

export type CompletedJobItemProps = {
  job: Job;
  weekday: string;
  onPress?: () => void;
};

export type LiveNowBannerProps = {
  client: string;
  region: string;
  elapsed: string;
  day: number;
  assignee: string;
  count: number;
};

export type TimerPillProps = {
  time: string;
  onPress?: () => void;
  paused?: boolean;
};

export type LiveStateBadgeProps = {
  state: LiveState;
};

/** The visual states the Job Detail screen renders. */
export type DetailState =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'awaiting_review'
  | 'approved'
  | 'cancelled';

/** Collapse the 8 backend statuses into the detail screen's states. */
export const detailStateFor = (status: JobStatus): DetailState => {
  switch (status) {
    case 'active':
      return 'active';
    case 'paused':
      return 'paused';
    case 'awaiting_review':
      return 'awaiting_review';
    case 'approved':
    case 'downloaded':
    case 'paid':
      return 'approved';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'scheduled';
  }
};
