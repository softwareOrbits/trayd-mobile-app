export const TIMER_STOPPING_SOON = 'timer_stopping_soon';
export const TIMER_AUTO_PAUSED = 'timer_auto_paused';

export type TimerPushType =
  | typeof TIMER_STOPPING_SOON
  | typeof TIMER_AUTO_PAUSED;

export type TimerPush = {
  type: TimerPushType;
  jobId: string | null;
};

type Listener = (push: TimerPush) => void;

const listeners = new Set<Listener>();

export function onTimerPush(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTimerPush(push: TimerPush): void {
  for (const listener of listeners) listener(push);
}

export function timerPushFrom(
  data: Record<string, unknown> | undefined,
): TimerPush | null {
  const type = data?.type ?? data?.notification_type;
  if (type !== TIMER_STOPPING_SOON && type !== TIMER_AUTO_PAUSED) return null;
  const rawJobId =
    data?.related_entity_id ?? data?.job_id ?? data?.jobId ?? data?.entity_id;
  return {
    type,
    jobId: typeof rawJobId === 'string' && rawJobId ? rawJobId : null,
  };
}
