import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';
import { getMyMemberRef } from './member';
import { base64ToUint8Array } from '@/utils/base64';
import { imageExtFromType, imageMimeFromType } from '@/utils/image';
import {
  LEAVE_TYPES,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_TAGLINE,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveRequestDraft,
  type LeaveStatus,
  type LeaveType,
} from '@/types';

const LEAVE_BUCKET = 'leave-documents';

const SYSTEM_CODES: readonly string[] = ['annual', 'sick', 'casual'];

const STATUS_FROM_DB: Record<string, LeaveStatus> = {
  pending: 'pending',
  approved: 'approved',
  declined: 'rejected',
  cancelled: 'closed',
};

const RPC_ERROR_MESSAGE: Record<string, string> = {
  zero_working_days: 'Pick at least one working day.',
  insufficient_balance: 'Not enough days left for this request.',
  overlapping_request: 'You already have leave booked in these dates.',
  cannot_cancel: 'This request can no longer be cancelled.',
};

type LeaveTypeRow = {
  id: string;
  code: string;
  name: string;
  is_paid: boolean;
  sort_order: number;
};

type HolidayRange = { start: string; end: string; recurring: boolean };

let typeRowsCache: LeaveTypeRow[] | null = null;
let holidayRanges: HolidayRange[] = [];

const uiTypeFor = (row: LeaveTypeRow): LeaveType =>
  SYSTEM_CODES.includes(row.code) ? (row.code as LeaveType) : 'other';

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

const friendlyRpcError = (message: string) => {
  const code = Object.keys(RPC_ERROR_MESSAGE).find(c => message.includes(c));
  return new Error(code ? RPC_ERROR_MESSAGE[code] : message);
};

async function loadLeaveTypes(): Promise<LeaveTypeRow[]> {
  if (typeRowsCache) return typeRowsCache;
  const { data, error } = await supabase
    .from('leave_types')
    .select('id, code, name, is_paid, sort_order')
    .order('sort_order');
  if (error) throw new Error(error.message);
  typeRowsCache = (data ?? []) as LeaveTypeRow[];
  return typeRowsCache;
}

async function loadHolidays(): Promise<void> {
  const { data, error } = await supabase
    .from('public_holidays')
    .select('start_date, end_date, recurs_annually');
  if (error) return;
  holidayRanges = (
    (data ?? []) as {
      start_date: string;
      end_date: string;
      recurs_annually: boolean;
    }[]
  ).map(h => ({
    start: h.start_date,
    end: h.end_date,
    recurring: h.recurs_annually,
  }));
}

export type LeaveTypeOption = {
  type: LeaveType;
  name: string;
  tagline: string;
};

const staticTypeOptions = (): LeaveTypeOption[] =>
  LEAVE_TYPES.map(type => ({
    type,
    name: LEAVE_TYPE_LABEL[type],
    tagline: LEAVE_TYPE_TAGLINE[type],
  }));

export async function fetchLeaveTypeOptions(): Promise<LeaveTypeOption[]> {
  try {
    const types = await loadLeaveTypes();
    if (!types.length) return staticTypeOptions();
    const seen = new Set<LeaveType>();
    const options: LeaveTypeOption[] = [];
    for (const t of types) {
      const ui = uiTypeFor(t);
      if (seen.has(ui)) continue;
      seen.add(ui);
      options.push({
        type: ui,
        name: ui === 'other' ? LEAVE_TYPE_LABEL.other : t.name,
        tagline: LEAVE_TYPE_TAGLINE[ui],
      });
    }
    if (!seen.has('other')) {
      options.push({
        type: 'other',
        name: LEAVE_TYPE_LABEL.other,
        tagline: LEAVE_TYPE_TAGLINE.other,
      });
    }
    return options;
  } catch {
    return staticTypeOptions();
  }
}

export function isHolidayKey(dateKey: string): boolean {
  const md = dateKey.slice(5);
  return holidayRanges.some(h =>
    h.recurring
      ? h.start.slice(5) <= md && md <= h.end.slice(5)
      : h.start <= dateKey && dateKey <= h.end,
  );
}

const FALLBACK_ENTITLEMENT: Record<LeaveType, number> = {
  annual: 20,
  sick: 5,
  casual: 3,
  other: 0,
};

const BALANCES_CACHE_KEY = 'leavebalances:v1';
const REQUESTS_CACHE_KEY = 'leaverequests:v1';

export async function fetchLeaveBalances(): Promise<LeaveBalance[]> {
  const year = new Date().getFullYear();
  try {
    const live = await fetchLiveBalances(year);
    AsyncStorage.setItem(BALANCES_CACHE_KEY, JSON.stringify(live)).catch(
      () => {},
    );
    return live;
  } catch {
    const raw = await AsyncStorage.getItem(BALANCES_CACHE_KEY).catch(
      () => null,
    );
    if (raw) {
      const cached = JSON.parse(raw) as LeaveBalance[];
      if (cached.length && cached.every(b => b.year === year)) return cached;
    }
    return LEAVE_TYPES.map(type => ({
      type,
      used: 0,
      entitlement: FALLBACK_ENTITLEMENT[type],
      year,
    }));
  }
}

async function fetchLiveBalances(year: number): Promise<LeaveBalance[]> {
  const me = await getMyMemberRef();

  const [types] = await Promise.all([loadLeaveTypes(), loadHolidays()]);

  const [entsRes, reqsRes] = await Promise.all([
    supabase
      .from('leave_member_entitlements')
      .select('leave_type_id, days_per_year')
      .eq('business_member_id', me.id)
      .eq('year', year),
    supabase
      .from('leave_requests')
      .select('leave_type_id, status, total_days')
      .eq('business_member_id', me.id)
      .gte('start_date', `${year}-01-01`)
      .lte('start_date', `${year}-12-31`),
  ]);
  if (entsRes.error) throw new Error(entsRes.error.message);
  if (reqsRes.error) throw new Error(reqsRes.error.message);

  const ents = (entsRes.data ?? []) as {
    leave_type_id: string;
    days_per_year: number | string;
  }[];
  const reqs = (reqsRes.data ?? []) as {
    leave_type_id: string;
    status: string;
    total_days: number | string;
  }[];

  return LEAVE_TYPES.map(ui => {
    const ids = types.filter(t => uiTypeFor(t) === ui).map(t => t.id);
    const entitlement = ents
      .filter(e => ids.includes(e.leave_type_id))
      .reduce((s, e) => s + num(e.days_per_year), 0);
    const used = reqs
      .filter(
        r =>
          ids.includes(r.leave_type_id) &&
          (r.status === 'approved' || r.status === 'pending'),
      )
      .reduce((s, r) => s + num(r.total_days), 0);
    return { type: ui, used, entitlement, year };
  });
}

type RequestRow = {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  total_days: number | string;
  note: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  leave_type_id: string;
  decided_by: { full_name: string | null } | { full_name: string | null }[] | null;
};

const AUTO_DECISION = /^auto[\s-]?approved\.?$/i;

const displayNote = (r: RequestRow, status: LeaveStatus): string | null => {
  const decision = r.decision_note?.trim();
  const isAuto = !!decision && AUTO_DECISION.test(decision);
  if (status === 'rejected' && decision) return r.decision_note;
  return r.note || (decision && !isAuto ? r.decision_note : null);
};

export async function fetchLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const live = await fetchLiveRequests();
    AsyncStorage.setItem(REQUESTS_CACHE_KEY, JSON.stringify(live)).catch(
      () => {},
    );
    return live;
  } catch (e) {
    const raw = await AsyncStorage.getItem(REQUESTS_CACHE_KEY).catch(
      () => null,
    );
    if (raw) return JSON.parse(raw) as LeaveRequest[];
    throw e;
  }
}

export async function fetchLeaveRequestById(
  id: string,
): Promise<LeaveRequest | null> {
  const all = await fetchLeaveRequests();
  return all.find(r => r.id === id) ?? null;
}

async function fetchLiveRequests(): Promise<LeaveRequest[]> {
  const me = await getMyMemberRef();
  const types = await loadLeaveTypes();

  const { data, error } = await supabase
    .from('leave_requests')
    .select(
      `id, status, start_date, end_date, total_days, note, decision_note,
       decided_at, created_at, leave_type_id,
       decided_by:business_members!leave_requests_decided_by_fkey (full_name)`,
    )
    .eq('business_member_id', me.id)
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);

  const uiById = new Map(types.map(t => [t.id, uiTypeFor(t)]));

  return ((data ?? []) as RequestRow[]).map(r => {
    const decider = Array.isArray(r.decided_by) ? r.decided_by[0] : r.decided_by;
    const status = STATUS_FROM_DB[r.status] ?? 'pending';
    const decision = r.decision_note?.trim();
    return {
      id: r.id,
      type: uiById.get(r.leave_type_id) ?? 'other',
      startDate: r.start_date,
      endDate: r.end_date,
      days: num(r.total_days),
      status,
      note: displayNote(r, status),
      ownNote: r.note || null,
      decisionNote:
        decision && !AUTO_DECISION.test(decision) ? r.decision_note : null,
      decidedBy: decider?.full_name ?? null,
      decidedAt: r.decided_at,
      createdAt: r.created_at,
    };
  });
}

export async function submitLeaveRequest(
  draft: LeaveRequestDraft,
): Promise<void> {
  const types = await loadLeaveTypes();
  const match = types.find(t => uiTypeFor(t) === draft.type);
  if (!match) {
    throw new Error('This leave type isn’t available yet — pick another.');
  }

  const { error } = await supabase.rpc('request_leave', {
    p_leave_type_id: match.id,
    p_start: draft.startDate,
    p_end: draft.endDate,
    p_note: draft.note || null,
    p_document_path: draft.documentPath ?? null,
  });
  if (error) throw friendlyRpcError(error.message);
}

export async function cancelLeaveRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_leave_request', {
    p_request_id: requestId,
  });
  if (error) throw friendlyRpcError(error.message);
}

export function canCancelRequest(request: LeaveRequest): boolean {
  if (request.status === 'pending') return true;
  if (request.status !== 'approved') return false;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return request.startDate > todayKey;
}

export async function uploadLeaveDocument(asset: {
  base64: string;
  type?: string | null;
}): Promise<string> {
  const me = await getMyMemberRef();
  const path = `${me.businessId}/${me.id}/${Date.now()}-cert.${imageExtFromType(asset.type)}`;
  const { error } = await supabase.storage
    .from(LEAVE_BUCKET)
    .upload(path, base64ToUint8Array(asset.base64), {
      contentType: imageMimeFromType(asset.type),
    });
  if (error) throw new Error(error.message);
  return path;
}
