import { supabase } from './supabase';

export const SHIFT_TIME_ZONE = 'Europe/Dublin';

const FALLBACK_STOP_LABEL = '5:00 PM';

export type AutoStopSettings = {
  enabled: boolean;
  stopTime: string | null;
  reminderMinutes: number | null;
};

export function irishWorkDate(reference: Date | number = Date.now()): string {
  return new Date(reference).toLocaleDateString('en-CA', {
    timeZone: SHIFT_TIME_ZONE,
  });
}

export function formatStopTime(value: string | null | undefined): string {
  const [rawHour, rawMinute] = (value ?? '').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return FALLBACK_STOP_LABEL;
  }
  const display = hour % 12 || 12;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${display}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export async function declareOvertime(): Promise<void> {
  const { error } = await supabase.rpc('declare_overtime');
  if (error) throw new Error(error.message);
}

export async function cancelOvertime(): Promise<void> {
  const { error } = await supabase.rpc('cancel_overtime');
  if (error) throw new Error(error.message);
}

export async function isOnOvertimeToday(): Promise<boolean> {
  const { data, error } = await supabase
    .from('overtime_declarations')
    .select('id')
    .eq('work_date', irishWorkDate())
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function fetchAutoStopSettings(): Promise<AutoStopSettings> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('auto_stop_enabled, auto_stop_time, auto_stop_reminder_minutes')
    .maybeSingle();
  if (error || !data) {
    return { enabled: true, stopTime: null, reminderMinutes: null };
  }
  const row = data as {
    auto_stop_enabled: boolean | null;
    auto_stop_time: string | null;
    auto_stop_reminder_minutes: number | null;
  };
  return {
    enabled: row.auto_stop_enabled !== false,
    stopTime: row.auto_stop_time,
    reminderMinutes: row.auto_stop_reminder_minutes,
  };
}
