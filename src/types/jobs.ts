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

export type JobTabKey = 'upcoming' | 'live' | 'done';

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

/** Which list tab a status belongs to (null = hidden, e.g. cancelled). */
export const STATUS_TAB: Record<JobStatus, JobTabKey | null> = {
  scheduled: 'upcoming',
  active: 'live',
  paused: 'live',
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
  onChat?: () => void;
  onTimer?: () => void;
};

export type LiveJobItemProps = {
  job: Job;
  elapsed: string;
  day: number;
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
};

export type LiveStateBadgeProps = {
  state: LiveState;
};
