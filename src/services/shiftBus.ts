export const SHIFT_PUSH_TYPES = ['shift_reminder', 'shift_force_stop'];

type Listener = () => void;

const listeners = new Set<Listener>();

export function onShiftPush(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitShiftPush(): void {
  for (const listener of listeners) listener();
}

export function isShiftPush(data: Record<string, unknown> | undefined): boolean {
  const type = data?.type ?? data?.notification_type;
  return typeof type === 'string' && SHIFT_PUSH_TYPES.includes(type);
}
