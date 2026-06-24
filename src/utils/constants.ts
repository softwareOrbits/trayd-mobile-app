import type { JobTypeOption } from '@/types';


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
