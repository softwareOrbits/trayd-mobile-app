import { supabase } from './supabase';
import { offlineRead } from './readCache';
import { getMyMemberRef } from './member';
import { numOrNull, pickOne } from './rows';
import { base64ToUint8Array } from '@/utils/base64';
import { imageExtFromType, imageMimeFromType } from '@/utils/image';
import { computeNextDueOn, validateScheduleInput } from '@/utils/serviceSchedule';
import type {
  MaintenanceItem,
  NewServiceScheduleInput,
  NewVanIssueInput,
  RecursBy,
  ServiceScheduleItem,
  ServiceType,
  VanIssue,
  VanLog,
  VanMaintenanceEntry,
  VanTask,
  Vehicle,
} from '@/types';

const FLEET_BUCKET = 'fleet';


const VEHICLE_SELECT =
  'id, registration, year, make, model, colour, status, odometer_km, nct_expiry, motor_tax_expiry, last_service_on, next_service_due';

type VehicleRow = {
  id: string;
  registration: string;
  year: number | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  status: string;
  odometer_km: number | null;
  nct_expiry: string | null;
  motor_tax_expiry: string | null;
  last_service_on: string | null;
  next_service_due: string | null;
};

const mapVehicle = (r: VehicleRow): Vehicle => ({
  id: r.id,
  registration: r.registration,
  year: r.year,
  make: r.make,
  model: r.model,
  colour: r.colour,
  status: r.status,
  odometerKm: r.odometer_km,
  nctExpiry: r.nct_expiry,
  motorTaxExpiry: r.motor_tax_expiry,
  lastServiceOn: r.last_service_on,
  nextServiceDue: r.next_service_due,
});

export async function fetchMyVan(): Promise<Vehicle | null> {
  const me = await getMyMemberRef();
  return offlineRead('myvan', async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('assigned_driver', me.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapVehicle(data as VehicleRow) : null;
  });
}

export async function fetchOwnerFirstName(): Promise<string | null> {
  return offlineRead('ownerfirstname', async () => {
    const { data, error } = await supabase
      .from('business_members')
      .select('full_name')
      .eq('is_owner', true)
      .eq('invite_status', 'active')
      .limit(1);
    if (error) throw new Error(error.message);
    const name = (data?.[0]?.full_name ?? '').trim();
    return name ? name.split(/\s+/)[0] : null;
  });
}

type PersonRow = { full_name: string | null } | { full_name: string | null }[] | null;

type IssueRow = {
  id: string;
  issue_number: string;
  kind: string;
  description: string;
  drivable: boolean;
  status: string;
  photo_paths: string[] | null;
  reported_by: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: PersonRow;
};

const mapIssue = (r: IssueRow): VanIssue => ({
  id: r.id,
  issueNumber: r.issue_number,
  kind: r.kind,
  description: r.description,
  drivable: r.drivable,
  status: r.status,
  photoPaths: r.photo_paths ?? [],
  reportedById: r.reported_by,
  reportedByName: pickOne(r.reporter)?.full_name ?? null,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

type MaintenanceRow = {
  id: string;
  entry_type: string;
  entry_date: string;
  mileage_km: number | null;
  description: string;
  next_time_notes: string | null;
  cost: number | string | null;
  issue_id: string | null;
  logger: PersonRow;
};

const mapMaintenance = (r: MaintenanceRow): VanMaintenanceEntry => ({
  id: r.id,
  entryType: r.entry_type,
  entryDate: r.entry_date,
  mileageKm: r.mileage_km,
  description: r.description,
  nextTimeNotes: r.next_time_notes,
  cost: numOrNull(r.cost),
  loggedByName: pickOne(r.logger)?.full_name ?? null,
  issueId: r.issue_id,
});

type VanTaskRow = {
  id: string;
  task_number: string | null;
  title: string;
  description: string | null;
  status: VanTask['status'];
  deadline_date: string | null;
  creator: PersonRow;
};

type ScheduleRow = {
  id: string;
  service_type: ServiceType;
  item_name: string;
  recurs_by: RecursBy;
  interval_months: number | null;
  interval_km: number | null;
  last_done_on: string | null;
  next_due_on: string | null;
  notes: string | null;
};

const SCHEDULE_SELECT =
  'id, service_type, item_name, recurs_by, interval_months, interval_km, last_done_on, next_due_on, notes';

const mapSchedule = (r: ScheduleRow): ServiceScheduleItem => ({
  id: r.id,
  serviceType: r.service_type,
  itemName: r.item_name,
  recursBy: r.recurs_by,
  intervalMonths: r.interval_months,
  intervalKm: r.interval_km,
  lastDoneOn: r.last_done_on,
  nextDueOn: r.next_due_on,
  notes: r.notes,
});

export async function fetchVanLog(vehicleId: string): Promise<VanLog> {
  return offlineRead(`vanlog:${vehicleId}`, async () => {
    const [vehicleRes, issuesRes, maintenanceRes, tasksRes, scheduleRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select(VEHICLE_SELECT)
        .eq('id', vehicleId)
        .single(),
      supabase
        .from('vehicle_issues')
        .select(
          'id, issue_number, kind, description, drivable, status, photo_paths, reported_by, created_at, resolved_at, reporter:business_members!vehicle_issues_reported_by_fkey (full_name)',
        )
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicle_maintenance')
        .select(
          'id, entry_type, entry_date, mileage_km, description, next_time_notes, cost, issue_id, logger:business_members!vehicle_maintenance_logged_by_fkey (full_name)',
        )
        .eq('vehicle_id', vehicleId)
        .order('entry_date', { ascending: false }),
      supabase
        .from('tasks')
        .select(
          'id, task_number, title, description, status, deadline_date, creator:business_members!tasks_assigned_by_fkey (full_name)',
        )
        .eq('vehicle_id', vehicleId)
        .neq('status', 'complete')
        .order('deadline_date', { nullsFirst: false }),
      supabase
        .from('vehicle_service_schedule')
        .select(SCHEDULE_SELECT)
        .eq('vehicle_id', vehicleId)
        .order('item_name'),
    ]);

    if (vehicleRes.error) throw new Error(vehicleRes.error.message);
    if (issuesRes.error) throw new Error(issuesRes.error.message);
    if (maintenanceRes.error) throw new Error(maintenanceRes.error.message);

    return {
      vehicle: mapVehicle(vehicleRes.data as VehicleRow),
      issues: ((issuesRes.data ?? []) as IssueRow[]).map(mapIssue),
      maintenance: ((maintenanceRes.data ?? []) as MaintenanceRow[]).map(
        mapMaintenance,
      ),
      tasks: ((tasksRes.data ?? []) as VanTaskRow[]).map(r => ({
        id: r.id,
        taskNumber: r.task_number,
        title: r.title,
        description: r.description,
        status: r.status,
        deadlineDate: r.deadline_date,
        creatorName: pickOne(r.creator)?.full_name ?? null,
      })),
      schedule: ((scheduleRes.data ?? []) as ScheduleRow[]).map(mapSchedule),
    };
  });
}

const CATALOG_ERROR: Record<string, string> = {
  '23505': 'That item is already in your list.',
  '42501': 'Only an owner can change the maintenance list.',
};

const catalogError = (e: { code?: string; message: string }) =>
  new Error((e.code && CATALOG_ERROR[e.code]) || e.message);

type MaintenanceItemRow = {
  id: string;
  name: string;
  default_cost: number | string | null;
  sort_order: number | null;
};

const MAINTENANCE_ITEM_SELECT = 'id, name, default_cost, sort_order';

const mapMaintenanceItem = (r: MaintenanceItemRow): MaintenanceItem => ({
  id: r.id,
  name: r.name,
  defaultCost: numOrNull(r.default_cost),
  sortOrder: r.sort_order ?? 0,
});

/**
 * Every business owns its own copy of the catalog, so RLS already scopes this
 * to the caller's rows. Readable by the whole team; only owners can write.
 */
export async function fetchMaintenanceItems(): Promise<MaintenanceItem[]> {
  return offlineRead('maintenanceitems', async () => {
    const { data, error } = await supabase
      .from('maintenance_items')
      .select(MAINTENANCE_ITEM_SELECT)
      .order('sort_order')
      .order('name');
    if (error) throw new Error(error.message);
    return ((data ?? []) as MaintenanceItemRow[]).map(mapMaintenanceItem);
  });
}

export async function addMaintenanceItem(
  name: string,
  defaultCost: number | null,
): Promise<MaintenanceItem> {
  const me = await getMyMemberRef();

  const { data: last } = await supabase
    .from('maintenance_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('maintenance_items')
    .insert({
      business_id: me.businessId,
      name: name.trim(),
      default_cost: defaultCost,
      sort_order: ((last?.sort_order as number | null) ?? 0) + 1,
    })
    .select(MAINTENANCE_ITEM_SELECT)
    .single();
  if (error) throw catalogError(error);

  return mapMaintenanceItem(data as MaintenanceItemRow);
}

export async function updateMaintenanceItem(
  id: string,
  name: string,
  defaultCost: number | null,
): Promise<MaintenanceItem> {
  const { data, error } = await supabase
    .from('maintenance_items')
    .update({ name: name.trim(), default_cost: defaultCost })
    .eq('id', id)
    .select(MAINTENANCE_ITEM_SELECT)
    .single();
  if (error) throw catalogError(error);
  return mapMaintenanceItem(data as MaintenanceItemRow);
}

/**
 * Schedule rows keep a text snapshot of the name, so deleting an item only
 * removes it as a future choice — existing schedules are untouched.
 */
export async function deleteMaintenanceItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('maintenance_items')
    .delete()
    .eq('id', id);
  if (error) throw catalogError(error);
}

export async function addServiceScheduleItem(
  input: NewServiceScheduleInput,
): Promise<ServiceScheduleItem> {
  const invalid = validateScheduleInput(input);
  if (invalid) throw new Error(invalid);

  const me = await getMyMemberRef();

  const { data, error } = await supabase
    .from('vehicle_service_schedule')
    .insert({
      business_id: me.businessId,
      vehicle_id: input.vehicleId,
      service_type: input.serviceType,
      item_name: input.itemName.trim(),
      recurs_by: input.recursBy,
      interval_months: input.recursBy === 'mileage' ? null : input.intervalMonths,
      interval_km: input.recursBy === 'time' ? null : input.intervalKm,
      last_done_on: input.lastDoneOn,
      next_due_on: computeNextDueOn(
        input.lastDoneOn,
        input.recursBy,
        input.intervalMonths,
      ),
      notes: input.notes?.trim() || null,
    })
    .select(SCHEDULE_SELECT)
    .single();
  if (error) {
    throw new Error(
      error.code === '42501'
        ? 'Only an owner can change the service schedule.'
        : error.message,
    );
  }

  return mapSchedule(data as ScheduleRow);
}

const REPORT_ISSUE_ERROR: Record<string, string> = {
  vehicle_not_found: 'That van is no longer on the fleet.',
  description_required: 'Tell us what’s wrong first.',
  not_a_member: 'You don’t have permission to report issues.',
  no_business: 'You don’t have permission to report issues.',
};

export async function reportVanIssue(
  input: NewVanIssueInput,
): Promise<{ id: string; issueNumber: string }> {
  const me = await getMyMemberRef();

  const stamp = Date.now();
  const paths: string[] = [];
  for (const [i, photo] of input.photos.entries()) {
    const path = `${me.businessId}/issues/${stamp}-${i}.${imageExtFromType(
      photo.type,
    )}`;
    const { error } = await supabase.storage
      .from(FLEET_BUCKET)
      .upload(path, base64ToUint8Array(photo.base64), {
        contentType: imageMimeFromType(photo.type),
      });
    if (!error) paths.push(path);
  }

  const { data, error } = await supabase.rpc('fleet_report_issue', {
    p_vehicle_id: input.vehicleId,
    p_description: input.description.trim(),
    p_kind: input.kind,
    p_drivable: input.drivable,
    p_photo_paths: paths,
  });
  if (error) {
    const code = Object.keys(REPORT_ISSUE_ERROR).find(c =>
      error.message.includes(c),
    );
    throw new Error(code ? REPORT_ISSUE_ERROR[code] : error.message);
  }

  const row = data as { id: string; issue_number: string };
  return { id: row.id, issueNumber: row.issue_number };
}

export async function vanPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(FLEET_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
