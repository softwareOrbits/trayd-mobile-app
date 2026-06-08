import type { JobStatus } from '@/types';

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
