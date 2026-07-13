export const SHIFT_END_HOUR = 17;
export const SHIFT_END_MINUTE = 0;
export const SHIFT_REMINDER_LEAD_MS = 15 * 60 * 1000;

export function shiftEndAt(reference: Date | number = Date.now()): Date {
  const at = new Date(reference);
  at.setHours(SHIFT_END_HOUR, SHIFT_END_MINUTE, 0, 0);
  return at;
}

export function shiftReminderAt(reference: Date | number = Date.now()): Date {
  return new Date(shiftEndAt(reference).getTime() - SHIFT_REMINDER_LEAD_MS);
}

export function shiftCutoffFor(
  startedAt: Date | number,
  rollForwardDays = 0,
): Date {
  const started = new Date(startedAt);
  let cutoff = shiftEndAt(started);
  let rollBy = rollForwardDays;
  if (started.getTime() >= cutoff.getTime()) rollBy += 1;
  if (rollBy === 0) return cutoff;
  const rolled = new Date(started);
  rolled.setDate(rolled.getDate() + rollBy);
  return shiftEndAt(rolled);
}

export function shiftDayKey(reference: Date | number = Date.now()): string {
  const at = new Date(reference);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function shiftEndLabel(): string {
  const hour = SHIFT_END_HOUR % 12 || 12;
  const suffix = SHIFT_END_HOUR >= 12 ? 'PM' : 'AM';
  return `${hour}:${String(SHIFT_END_MINUTE).padStart(2, '0')} ${suffix}`;
}
