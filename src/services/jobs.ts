import { supabase } from './supabase';
import { fetchMyMember } from './member';
import { base64ToUint8Array } from '@/utils/base64';
import { imageExtFromType, imageMimeFromType } from '@/utils/image';
import type { Job, JobDetail, JobStatus, JobType } from '@/types';

type ListRow = {
  id: string;
  job_number: string | null;
  job_type: string;
  status: string;
  raw_job_status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  primary_member_id: string | null;
  primary_member_name: string | null;
  invoice_total: number | string | null;
  last_activity_at: string | null;
  total_count: number;
};

type DetailRow = ListRow & {
  started_at: string | null;
  finished_at: string | null;
  employer_note: string | null;
  is_callout: boolean;
  total_hours: number | string | null;
  summary: string | null;
  created_by_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_eircode: string | null;
  primary_member_role: string | null;
};

const num = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

const mapList = (r: ListRow): Job => ({
  id: r.id,
  jobNumber: r.job_number,
  jobType: r.job_type as JobType,
  status: r.status as JobStatus,
  rawStatus: r.raw_job_status,
  scheduledDate: r.scheduled_date,
  scheduledStartTime: r.scheduled_start_time,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  customerId: r.customer_id,
  customerName: r.customer_name,
  customerAddress: r.customer_address,
  primaryMemberId: r.primary_member_id,
  primaryMemberName: r.primary_member_name,
  invoiceTotal: num(r.invoice_total),
  lastActivityAt: r.last_activity_at,
});

const mapDetail = (r: DetailRow): JobDetail => ({
  id: r.id,
  jobNumber: r.job_number,
  jobType: r.job_type as JobType,
  status: r.status as JobStatus,
  rawStatus: r.raw_job_status,
  scheduledDate: r.scheduled_date,
  scheduledStartTime: r.scheduled_start_time,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  employerNote: r.employer_note,
  isCallout: r.is_callout,
  totalHours: r.total_hours == null ? null : num(r.total_hours),
  summary: r.summary,
  createdByName: r.created_by_name,
  customerId: r.customer_id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  customerEmail: r.customer_email,
  customerAddress: r.customer_address,
  customerEircode: r.customer_eircode,
  primaryMemberId: r.primary_member_id,
  primaryMemberName: r.primary_member_name,
  primaryMemberRole: r.primary_member_role,
  invoiceTotal: num(r.invoice_total),
});

/** Jobs where the signed-in employee is the primary assignee. */
export async function fetchMyJobs(): Promise<Job[]> {
  const me = await fetchMyMember();
  const { data, error } = await supabase.rpc('list_jobs', {
    p_tab: 'all',
    p_employee_id: me.id,
    p_limit: 100,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ListRow[]).map(mapList);
}

/** Full detail for a single job. */
export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const { data, error } = await supabase.rpc('get_job_detail', { p_id: id });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as DetailRow | undefined;
  if (!row) throw new Error('Job not found');
  return mapDetail(row);
}

/**
 * Transition a job's status (allowed for the employee via the `jobs_tenant`
 * RLS policy). On first activation we also stamp `started_at` so the live
 * timer has a real anchor. NOTE: richer side-effects on start/finish
 * (job_days / job_time_entries / invoices) still need a dedicated backend RPC.
 */
export async function updateJobStatus(
  id: string,
  status: JobStatus,
): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);

  if (status === 'active') {
    const { error: stampError } = await supabase
      .from('jobs')
      .update({ started_at: new Date().toISOString() })
      .eq('id', id)
      .is('started_at', null);
    if (stampError) {
      console.warn('Could not stamp started_at:', stampError.message);
    }
  }
}

export type JobEdit = {
  jobType?: JobType;
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
};

export async function updateJob(id: string, edit: JobEdit): Promise<void> {
  const row: Record<string, unknown> = {};
  if (edit.jobType !== undefined) row.job_type = edit.jobType;
  if (edit.scheduledDate !== undefined) row.scheduled_date = edit.scheduledDate;
  if (edit.scheduledStartTime !== undefined) {
    row.scheduled_start_time = edit.scheduledStartTime;
  }
  const { data, error } = await supabase
    .from('jobs')
    .update(row)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error('You don’t have permission to edit this job.');
  }
}

export async function cancelJob(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error('You don’t have permission to cancel this job.');
  }
}

export async function deleteJob(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error('You don’t have permission to delete this job.');
  }
}

export type StartJobPayload = {
  customerId?: string;
  newCustomer?: {
    name: string;
    phone: string;
    email?: string | null;
    address: string;
    eircode: string;
  };
  jobType?: JobType;
  memberIds?: string[];
  gps?: { lat: number; lng: number; eircode?: string } | null;
};

export class DuplicateCustomerError extends Error {
  constructor(public existingId: string) {
    super('duplicate_customer');
    this.name = 'DuplicateCustomerError';
  }
}

export async function startJob(payload: StartJobPayload): Promise<string> {
  const { data, error } = await supabase.rpc('start_job', {
    p_customer_id: payload.customerId ?? null,
    p_new_customer: payload.newCustomer
      ? {
          name: payload.newCustomer.name,
          phone: payload.newCustomer.phone,
          email: payload.newCustomer.email ?? null,
          address: payload.newCustomer.address,
          eircode: payload.newCustomer.eircode,
        }
      : null,
    p_job_type: payload.jobType ?? 'standard',
    p_member_ids: payload.memberIds ?? [],
    p_gps_lat: payload.gps?.lat ?? null,
    p_gps_lng: payload.gps?.lng ?? null,
    p_gps_eircode: payload.gps?.eircode ?? null,
  });

  if (error) {
    const m = /^duplicate_customer:([0-9a-f-]{36})/.exec(error.message);
    if (m) throw new DuplicateCustomerError(m[1]);
    throw new Error(error.message);
  }
  return data as string;
}

const JOB_PHOTO_BUCKET = 'job-photos';

export type MaterialSource = 'van_stock' | 'receipt';

export type JobMaterial = {
  id: string;
  description: string;
  quantity: number;
  unit: string | null;
  source: MaterialSource;
  unitCost: number;
  jobDayId: string | null;
  addedBy: string | null;
  createdAt: string;
};

type MaterialRow = {
  id: string;
  description: string;
  quantity: number | string | null;
  unit: string | null;
  source: string;
  unit_cost: number | string | null;
  job_day_id: string | null;
  added_by: string | null;
  created_at: string;
};

export async function fetchJobMaterials(jobId: string): Promise<JobMaterial[]> {
  const { data, error } = await supabase
    .from('job_materials')
    .select(
      'id, description, quantity, unit, source, unit_cost, job_day_id, added_by, created_at',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as MaterialRow[]).map(r => ({
    id: r.id,
    description: r.description,
    quantity: num(r.quantity) || 1,
    unit: r.unit,
    source: (r.source === 'receipt' ? 'receipt' : 'van_stock') as MaterialSource,
    unitCost: num(r.unit_cost),
    addedBy: r.added_by,
    jobDayId: r.job_day_id,
    createdAt: r.created_at,
  }));
}

export async function addJobMaterial(input: {
  jobId: string;
  description: string;
  quantity: number;
  unitCost: number;
  source: MaterialSource;
  unit?: string | null;
}): Promise<void> {
  const me = await fetchMyMember();
  const dayId = await fetchCurrentJobDayId(input.jobId).catch(() => null);
  const { error } = await supabase.from('job_materials').insert({
    job_id: input.jobId,
    business_id: me.businessId,
    job_day_id: dayId,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit ?? null,
    source: input.source,
    unit_cost: input.unitCost,
    added_by: me.id,
  });
  if (error) throw new Error(error.message);
}

export async function updateJobMaterial(
  id: string,
  patch: { description?: string; quantity?: number; unitCost?: number; unit?: string | null },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.unitCost !== undefined) row.unit_cost = patch.unitCost;
  if (patch.unit !== undefined) row.unit = patch.unit;
  if (!Object.keys(row).length) return;
  const { data, error } = await supabase
    .from('job_materials')
    .update(row)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('You can only edit items you logged.');
}

export async function deleteJobMaterial(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('job_materials')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('You can only remove items you logged.');
}

export async function addJobAssignment(
  jobId: string,
  memberId: string,
): Promise<void> {
  const me = await fetchMyMember();
  const { error } = await supabase.from('job_assignments').insert({
    job_id: jobId,
    business_id: me.businessId,
    business_member_id: memberId,
  });
  if (error) throw new Error(error.message);
}

export async function removeJobAssignment(
  jobId: string,
  memberId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('job_assignments')
    .delete()
    .eq('job_id', jobId)
    .eq('business_member_id', memberId)
    .select('business_member_id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error('Could not remove that person.');
}

export async function fetchCurrentJobDayId(
  jobId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('job_days')
    .select('id')
    .eq('job_id', jobId)
    .order('day_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}

export type JobPhotoPhase = 'before' | 'during' | 'after';

export type JobPhoto = {
  id: string;
  phase: string;
  takenAt: string | null;
  url: string | null;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  phase: string;
  taken_at: string | null;
};

export async function fetchJobPhotos(jobId: string): Promise<JobPhoto[]> {
  const { data, error } = await supabase
    .from('job_photos')
    .select('id, storage_path, phase, taken_at')
    .eq('job_id', jobId)
    .order('taken_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PhotoRow[];
  if (!rows.length) return [];

  const { data: signed } = await supabase.storage
    .from(JOB_PHOTO_BUCKET)
    .createSignedUrls(rows.map(r => r.storage_path), 3600);
  const urlFor = new Map(
    (signed ?? [])
      .filter(s => s.signedUrl && s.path)
      .map(s => [s.path as string, s.signedUrl]),
  );

  return rows.map(r => ({
    id: r.id,
    phase: r.phase,
    takenAt: r.taken_at,
    url: urlFor.get(r.storage_path) ?? null,
  }));
}


const uuidv4 = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r % 4) + 8).toString(16);
  });

/**
 * Storage RLS keys on the first path segment being the caller's business id,
 * so the path convention is `{business_id}/{job_id}/{phase}/{uuid}.{ext}`.
 */
export async function addJobPhoto(input: {
  jobId: string;
  phase: JobPhotoPhase;
  base64: string;
  type?: string | null;
}): Promise<void> {
  const me = await fetchMyMember();
  const path = `${me.businessId}/${input.jobId}/${input.phase}/${uuidv4()}.${imageExtFromType(input.type)}`;
  const dayId = await fetchCurrentJobDayId(input.jobId).catch(() => null);

  const { error: uploadError } = await supabase.storage
    .from(JOB_PHOTO_BUCKET)
    .upload(path, base64ToUint8Array(input.base64), {
      contentType: imageMimeFromType(input.type),
      cacheControl: '31536000',
    });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from('job_photos').insert({
    job_id: input.jobId,
    business_id: me.businessId,
    business_member_id: me.id,
    job_day_id: dayId,
    storage_path: path,
    phase: input.phase,
    taken_at: new Date().toISOString(),
    sync_state: 'synced',
  });
  if (error) throw new Error(error.message);
}

export type NoteVisibility = 'employer_only' | 'customer_visible';

export type JobNote = {
  id: string;
  body: string;
  visibility: string;
  createdAt: string;
};

type NoteRow = {
  id: string;
  body: string;
  visibility: string;
  created_at: string;
};

export async function fetchJobNotes(jobId: string): Promise<JobNote[]> {
  const { data, error } = await supabase
    .from('job_notes')
    .select('id, body, visibility, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as NoteRow[]).map(r => ({
    id: r.id,
    body: r.body,
    visibility: r.visibility,
    createdAt: r.created_at,
  }));
}

export async function addJobNote(
  jobId: string,
  body: string,
  visibility: NoteVisibility = 'employer_only',
): Promise<void> {
  const me = await fetchMyMember();
  const { error } = await supabase.from('job_notes').insert({
    job_id: jobId,
    business_id: me.businessId,
    business_member_id: me.id,
    body,
    visibility,
  });
  if (error) throw new Error(error.message);
}

const RECEIPT_BUCKET = 'receipts';
/** Max wait for the extract-receipt Edge Function before manual-entry fallback. */
const EXTRACT_TIMEOUT_MS = 15000;

export type ReceiptConfidence = 'high' | 'medium' | 'low';

export type ExtractedReceiptLine = {
  description: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
  vat_rate?: number;
  confidence: ReceiptConfidence;
};

export type ExtractedReceipt = {
  vendor?: string;
  location?: string;
  receipt_date?: string; // 'YYYY-MM-DD'
  receipt_time?: string; // 'HH:MM'
  line_items: ExtractedReceiptLine[];
  subtotal?: number;
  vat_amount?: number;
  total?: number;
  overall_confidence: ReceiptConfidence;
  issues?: string;
};

export type ReceiptExtraction = {
  receiptId: string;
  storagePath: string;
  ok: boolean;
  extracted: ExtractedReceipt | null;
};

export async function uploadAndExtractReceipt(input: {
  jobId: string;
  base64: string;
  type?: string | null;
}): Promise<ReceiptExtraction> {
  const me = await fetchMyMember();
  const path = `${me.businessId}/${input.jobId}/${uuidv4()}.${imageExtFromType(input.type)}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, base64ToUint8Array(input.base64), {
      contentType: imageMimeFromType(input.type),
      cacheControl: '31536000',
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data: receipt, error: insErr } = await supabase
    .from('receipts')
    .insert({
      job_id: input.jobId,
      business_id: me.businessId,
      business_member_id: me.id,
      storage_path: path,
      ocr_status: 'pending',
    })
    .select('id')
    .single();
  if (insErr) throw new Error(insErr.message);

  try {
    // The Edge Function can cold-start or stall on Claude; cap the wait so the
    // spinner can never hang. On timeout we fall back to manual entry â€” the row
    // and image are already saved (mds job-logging Â§6).
    const call = supabase.functions.invoke('extract-receipt', {
      body: { receipt_id: receipt.id },
    });
    call.catch(() => undefined); // swallow a late rejection if the timeout wins
    const { data, error } = await Promise.race([
      call,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('extract_timeout')), EXTRACT_TIMEOUT_MS),
      ),
    ]);
    if (error) throw error;
    if (!data || data.ok === false) {
      return { receiptId: receipt.id, storagePath: path, ok: false, extracted: null };
    }
    return {
      receiptId: receipt.id,
      storagePath: path,
      ok: true,
      extracted: (data.extracted ?? null) as ExtractedReceipt | null,
    };
  } catch (e) {
    console.warn('extract-receipt:', e instanceof Error ? e.message : e);
    return { receiptId: receipt.id, storagePath: path, ok: false, extracted: null };
  }
}

export type ReceiptLine = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat: number | null;
  confirmed: boolean;
};

type ReceiptLineRow = {
  id: string;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  vat: number | string | null;
  confirmed: boolean;
};

export async function fetchReceiptLineItems(
  receiptId: string,
): Promise<ReceiptLine[]> {
  const { data, error } = await supabase
    .from('receipt_line_items')
    .select('id, description, quantity, unit_price, vat, confirmed')
    .eq('receipt_id', receiptId)
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as ReceiptLineRow[]).map(r => ({
    id: r.id,
    description: r.description,
    quantity: num(r.quantity) || 1,
    unitPrice: num(r.unit_price),
    vat: r.vat == null ? null : num(r.vat),
    confirmed: r.confirmed,
  }));
}

export async function addReceiptLine(input: {
  receiptId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vat?: number | null;
}): Promise<void> {
  const me = await fetchMyMember();
  const { error } = await supabase.from('receipt_line_items').insert({
    business_id: me.businessId,
    receipt_id: input.receiptId,
    description: input.description,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    vat: input.vat ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateReceiptLine(
  lineId: string,
  patch: { description?: string; quantity?: number; unitPrice?: number; vat?: number | null },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.unitPrice !== undefined) row.unit_price = patch.unitPrice;
  if (patch.vat !== undefined) row.vat = patch.vat;
  const { error } = await supabase
    .from('receipt_line_items')
    .update(row)
    .eq('id', lineId);
  if (error) throw new Error(error.message);
}

export async function deleteReceiptLine(lineId: string): Promise<void> {
  const { error } = await supabase
    .from('receipt_line_items')
    .delete()
    .eq('id', lineId);
  if (error) throw new Error(error.message);
}

export async function updateReceiptHeader(
  receiptId: string,
  patch: { vendor?: string; receiptDate?: string | null; vatAmount?: number | null },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.vendor !== undefined) row.vendor = patch.vendor;
  if (patch.receiptDate !== undefined) row.receipt_date = patch.receiptDate;
  if (patch.vatAmount !== undefined) row.vat_amount = patch.vatAmount;
  if (!Object.keys(row).length) return;
  const { error } = await supabase
    .from('receipts')
    .update(row)
    .eq('id', receiptId);
  if (error) throw new Error(error.message);
}

export async function confirmReceiptToJob(receiptId: string): Promise<number> {
  const { data, error } = await supabase.rpc('save_receipt_to_job', {
    p_receipt_id: receiptId,
  });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

export async function discardReceipt(
  receiptId: string,
  storagePath?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);
  if (error) throw new Error(error.message);
  if (storagePath) {
    await supabase.storage.from(RECEIPT_BUCKET).remove([storagePath]);
  }
}

export type JobCrewMember = {
  id: string;
  name: string;
};

type AssignmentRow = {
  business_member_id: string;
  business_members:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

export async function fetchJobRoster(jobId: string): Promise<JobCrewMember[]> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('business_member_id, business_members(full_name)')
    .eq('job_id', jobId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as AssignmentRow[]).map(r => {
    const m = Array.isArray(r.business_members)
      ? r.business_members[0]
      : r.business_members;
    return { id: r.business_member_id, name: m?.full_name ?? 'Member' };
  });
}

export function humaniseLifecycle(msg: string): string {
  if (msg.startsWith('job_not_active'))
    return 'Job is not running â€” pull to refresh.';
  if (msg.startsWith('job_not_paused'))
    return 'Job is not paused â€” pull to refresh.';
  if (msg.startsWith('job_not_in_progress'))
    return 'This job was already finished.';
  if (msg.startsWith('job_not_found')) return 'Job not found.';
  if (msg.startsWith('not_a_member')) return 'Your access has been revoked.';
  if (msg.startsWith('invalid_time_future')) return 'That time is in the future.';
  if (msg.startsWith('invalid_time_before_start'))
    return 'That time is before the job started.';
  return msg;
}

export function isAccessRevoked(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  return (
    msg.startsWith('not_a_member') ||
    msg.startsWith('Your access has been revoked') ||
    msg.startsWith('Not authenticated')
  );
}

const lifecycleError = (msg: string) => new Error(humaniseLifecycle(msg));

export async function pauseJob(jobId: string, atIso?: string): Promise<void> {
  const { error } = await supabase.rpc('pause_job', {
    p_job_id: jobId,
    p_at: atIso ?? null,
  });
  if (error) throw lifecycleError(error.message);
}

export async function resumeJob(jobId: string, atIso?: string): Promise<void> {
  const { error } = await supabase.rpc('resume_job', {
    p_job_id: jobId,
    p_at: atIso ?? null,
  });
  if (error) throw lifecycleError(error.message);
}

export async function finishJob(input: {
  jobId: string;
  summary: string | null;
  totalHours?: number | null;
  atIso?: string | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc('finish_job', {
    p_job_id: input.jobId,
    p_summary: input.summary?.trim() || null,
    p_total_hours: input.totalHours ?? null,
    p_at: input.atIso ?? null,
  });
  if (error) throw lifecycleError(error.message);
  return typeof data === 'number' ? data : num(data as never);
}

export type JobSegment = {
  id: string;
  jobDayId: string | null;
  memberId: string;
  startTime: string;
  finishTime: string | null;
  hours: number | null;
};

type SegmentRow = {
  id: string;
  job_day_id: string | null;
  business_member_id: string;
  start_time: string;
  finish_time: string | null;
  hours: number | string | null;
};

export async function fetchJobSegments(jobId: string): Promise<JobSegment[]> {
  const { data, error } = await supabase
    .from('job_time_entries')
    .select('id, job_day_id, business_member_id, start_time, finish_time, hours')
    .eq('job_id', jobId)
    .order('start_time', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SegmentRow[]).map(r => ({
    id: r.id,
    jobDayId: r.job_day_id,
    memberId: r.business_member_id,
    startTime: r.start_time,
    finishTime: r.finish_time,
    hours: r.hours == null ? null : num(r.hours),
  }));
}

export function segmentsElapsedHours(
  segments: JobSegment[],
  nowMs: number,
): { hours: number; openStart: string | null; earliestStart: string | null } {
  let hours = 0;
  let openStart: string | null = null;
  let earliestStart: string | null = null;
  for (const s of segments) {
    if (!earliestStart || s.startTime < earliestStart) {
      earliestStart = s.startTime;
    }
    if (s.finishTime == null) {
      openStart = s.startTime;
      hours += Math.max(
        0,
        (nowMs - new Date(s.startTime).getTime()) / 3_600_000,
      );
    } else {
      hours += s.hours ?? 0;
    }
  }
  return { hours, openStart, earliestStart };
}

export type JobDay = {
  id: string;
  dayNumber: number;
  workDate: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export async function fetchJobDays(jobId: string): Promise<JobDay[]> {
  const { data, error } = await supabase
    .from('job_days')
    .select('id, day_number, work_date, started_at, finished_at')
    .eq('job_id', jobId)
    .order('day_number', { ascending: true });
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      id: string;
      day_number: number;
      work_date: string;
      started_at: string | null;
      finished_at: string | null;
    }[]
  ).map(r => ({
    id: r.id,
    dayNumber: r.day_number,
    workDate: r.work_date,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  }));
}

export type DayBreakdown = JobDay & {
  hours: number;
  crew: number;
  materialsTotal: number;
};

export function buildDayBreakdown(
  days: JobDay[],
  segments: JobSegment[],
  materials: { jobDayId?: string | null; quantity: number; unitCost: number }[],
): DayBreakdown[] {
  return days.map(d => {
    const dSegs = segments.filter(s => s.jobDayId === d.id);
    const dMats = materials.filter(m => m.jobDayId === d.id);
    return {
      ...d,
      hours: dSegs.reduce((sum, s) => sum + (s.hours ?? 0), 0),
      crew: new Set(dSegs.map(s => s.memberId)).size,
      materialsTotal: dMats.reduce((sum, m) => sum + m.quantity * m.unitCost, 0),
    };
  });
}

export function pausedSinceFrom(segments: JobSegment[]): string | null {
  return (
    segments
      .filter(s => s.finishTime)
      .map(s => s.finishTime as string)
      .sort()
      .at(-1) ?? null
  );
}

export async function editSegmentFinishTime(
  entryId: string,
  finishIso: string,
  reason?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('job_time_entries')
    .update({ finish_time: finishIso, edit_reason: reason || null })
    .eq('id', entryId);
  if (error) throw new Error(error.message);
}
export async function editSegmentStartTime(
  entryId: string,
  startIso: string,
  reason?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('job_time_entries')
    .update({ start_time: startIso, edit_reason: reason || null })
    .eq('id', entryId);
  if (error) throw new Error(error.message);
}

export async function fetchAssignmentRates(
  jobId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('business_member_id, hourly_rate_snapshot')
    .eq('job_id', jobId);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const r of (data ?? []) as {
    business_member_id: string;
    hourly_rate_snapshot: number | string | null;
  }[]) {
    map.set(r.business_member_id, num(r.hourly_rate_snapshot));
  }
  return map;
}

export async function fetchDefaultVatRate(): Promise<number> {
  const { data, error } = await supabase
    .from('business_settings')
    .select('default_vat_rate')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return num(
    (data as { default_vat_rate: number | string | null })?.default_vat_rate,
  );
}

export async function confirmJobMaterials(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('job_materials')
    .update({ confirmed: true })
    .eq('job_id', jobId);
  if (error) throw new Error(error.message);
}
