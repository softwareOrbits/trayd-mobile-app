export type MutationKind =
  | 'job.pause'
  | 'job.resume'
  | 'job.finish'
  | 'job.addNote'
  | 'profile.phone'
  | 'profile.workingHours'
  | 'profile.serviceArea';

export type QueuedMutation<P = unknown> = {
  id: string;
  kind: MutationKind;
  payload: P;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'failed';
  lastError?: string;
};

export type FlushOutcome = 'done' | 'retry' | 'drop';

export type Handler<P = unknown> = (payload: P) => Promise<FlushOutcome>;

export type SyncSnapshot = {
  pending: number;
  syncing: boolean;
  lastError: string | null;
};
