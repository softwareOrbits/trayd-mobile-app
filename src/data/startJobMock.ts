import type { IconName } from '@/types';

export type JobTypeOption = {
  key: 'standard' | 'quote' | 'callout';
  icon: IconName;
  title: string;
  subtitle: string;
};

/** Static copy for the Start Job wizard's job-type step. */
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
