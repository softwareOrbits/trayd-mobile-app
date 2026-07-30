import { supabase } from './supabase';
import { offlineRead } from './readCache';
import { getMyMemberRef } from './member';
import { numOrNull, pickOne } from './rows';
import { base64ToUint8Array } from '@/utils/base64';
import { imageExtFromType, imageMimeFromType } from '@/utils/image';
import type {
  NewVanIssueInput,
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

export async function fetchVanLog(vehicleId: string): Promise<VanLog> {
  return offlineRead(`vanlog:${vehicleId}`, async () => {
    const [vehicleRes, issuesRes, maintenanceRes, tasksRes] = await Promise.all([
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
    };
  });
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
