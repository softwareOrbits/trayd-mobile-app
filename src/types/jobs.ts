export type JobStatus =
  | 'scheduled'
  | 'quote'
  | 'live'
  | 'paused'
  | 'completed';

export type JobTabKey = 'upcoming' | 'live' | 'completed';

export type ReviewStatus = 'approved' | 'awaiting_review';

export type Job = {
  id: string;
  client: string;
  region: string;
  postcode: string;
  service: string;
  status: JobStatus;
  time: string;
  scheduledDate: string;
  coAssignedBy?: string;
  review?: ReviewStatus;
};

export type NewJob = Omit<Job, 'id'>;

export type JobUpdate = Partial<NewJob>;

export type JobsStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

export type JobsState = {
  items: Job[];
  status: JobsStatus;
  error: string | null;
};

export type JobSection = {
  id: string;
  label: string;
  jobs: Job[];
};

export type LiveState = 'active' | 'paused';

export type LiveMeta = {
  elapsed: string;
  day: number;
};

export type LiveJobItemProps = {
  job: Job;
  elapsed: string;
  day: number;
  onPress?: () => void;
  onChat?: () => void;
  onTimer?: () => void;
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

export type ReviewBadgeProps = {
  review: ReviewStatus;
};

export type CompletedJobItemProps = {
  job: Job;
  weekday: string;
  onPress?: () => void;
};
