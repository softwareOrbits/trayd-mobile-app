import { dateKey, parseDateKey, todayKey } from './datetime';
import type {
  NewServiceScheduleInput,
  RecursBy,
  ServiceScheduleItem,
  ServiceScheduleStatus,
  ServiceType,
} from '@/types';

export const SERVICE_TYPES: { key: ServiceType; label: string }[] = [
  { key: 'minor_service', label: 'Minor Service' },
  { key: 'major_service', label: 'Major Service' },
  { key: 'repair', label: 'Repair' },
  { key: 'inspection', label: 'Inspection' },
  { key: 'other', label: 'Other' },
];

export const RECURS_BY_OPTIONS: { key: RecursBy; label: string }[] = [
  { key: 'time', label: 'Time' },
  { key: 'mileage', label: 'Mileage' },
  { key: 'both', label: 'Both' },
];

export const serviceTypeLabel = (type: string) =>
  SERVICE_TYPES.find(t => t.key === type)?.label ?? 'Other';

const DUE_SOON_DAYS = 30;

const km = (value: number) => `${value.toLocaleString('en-GB')} km`;
const months = (value: number) => `${value} mo`;

export const needsMonths = (recursBy: RecursBy) => recursBy !== 'mileage';
export const needsKm = (recursBy: RecursBy) => recursBy !== 'time';

/**
 * Mirrors the DB CHECKs on `vehicle_service_schedule` so a bad combination is
 * caught before the insert 400s.
 */
export function validateScheduleInput(
  input: NewServiceScheduleInput,
): string | null {
  if (!input.itemName.trim()) return 'Pick a maintenance item first.';
  if (needsMonths(input.recursBy) && !input.intervalMonths) {
    return 'Tell us how many months between services.';
  }
  if (needsKm(input.recursBy) && !input.intervalKm) {
    return 'Tell us how many km between services.';
  }
  return null;
}

/**
 * NEXT DUE has no DB trigger — the client projects it from LAST DONE. Mileage
 * only schedules have no date to project from, so they stay null and are judged
 * against the odometer instead.
 */
export function computeNextDueOn(
  lastDoneOn: string | null,
  recursBy: RecursBy,
  intervalMonths: number | null,
): string | null {
  if (!lastDoneOn || !intervalMonths || !needsMonths(recursBy)) return null;
  const from = parseDateKey(lastDoneOn);
  if (!from) return null;
  const due = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  due.setMonth(due.getMonth() + intervalMonths);
  return dateKey(due);
}

export function intervalText(item: ServiceScheduleItem): string {
  const parts: string[] = [];
  if (needsMonths(item.recursBy) && item.intervalMonths) {
    parts.push(months(item.intervalMonths));
  }
  if (needsKm(item.recursBy) && item.intervalKm) {
    parts.push(km(item.intervalKm));
  }
  return parts.length ? `Every ${parts.join(' / ')}` : 'No interval set';
}

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86400000);

/**
 * Status is derived, never stored. Time based rows compare NEXT DUE to today;
 * mileage based rows compare the van's odometer to the reading it was last done
 * at plus the interval (null baseline → we can't say).
 */
export function scheduleStatus(
  item: ServiceScheduleItem,
  odometerKm: number | null,
  lastDoneKm: number | null,
): ServiceScheduleStatus {
  if (item.recursBy === 'mileage') {
    if (odometerKm == null || lastDoneKm == null || !item.intervalKm) {
      return 'unknown';
    }
    const remaining = lastDoneKm + item.intervalKm - odometerKm;
    if (remaining <= 0) return 'overdue';
    if (remaining <= 1000) return 'due_soon';
    return 'ok';
  }

  const due = parseDateKey(item.nextDueOn);
  if (!due) return 'unknown';
  const today = parseDateKey(todayKey());
  if (!today) return 'unknown';
  const days = daysBetween(today, due);
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'due_soon';
  return 'ok';
}

export const SCHEDULE_STATUS_LABEL: Record<ServiceScheduleStatus, string> = {
  overdue: 'OVERDUE',
  due_soon: 'DUE SOON',
  ok: 'ON TRACK',
  unknown: 'NO DATE SET',
};
