import { supabase } from './supabase';
import { offlineRead } from './readCache';
import { getMyMemberRef } from './member';
import { num, pickOne } from './rows';
import type {
  AssignableEmployee,
  NewTaskInput,
  Task,
  TaskEvent,
  TaskEventKind,
  TaskPerson,
  TaskStatus,
} from '@/types';


type PersonRow = { id: string; full_name: string | null; is_owner: boolean } | null;

const mapPerson = (row: PersonRow | PersonRow[]): TaskPerson | null => {
  const r = pickOne(row);
  if (!r) return null;
  return { id: r.id, name: r.full_name, isOwner: r.is_owner === true };
};

type TaskRow = {
  id: string;
  task_number: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadline_date: string | null;
  deadline_time: string | null;
  address: string | null;
  eircode: string | null;
  gps_lat: number | string | null;
  gps_lng: number | string | null;
  assignee: PersonRow | PersonRow[];
  creator: PersonRow | PersonRow[];
  vehicle:
    | { registration: string | null; make: string | null; model: string | null }
    | { registration: string | null; make: string | null; model: string | null }[]
    | null;
};

const SELECT = `id, task_number, title, description, status, deadline_date, deadline_time,
  address, eircode, gps_lat, gps_lng,
  assignee:business_members!tasks_assigned_to_fkey (id, full_name, is_owner),
  creator:business_members!tasks_assigned_by_fkey (id, full_name, is_owner),
  vehicle:vehicles (registration, make, model)`;

const mapTask = (r: TaskRow): Task => ({
  id: r.id,
  taskNumber: r.task_number,
  title: r.title,
  description: r.description,
  status: r.status,
  deadlineDate: r.deadline_date,
  deadlineTime: r.deadline_time ? r.deadline_time.slice(0, 5) : null,
  address: r.address,
  eircode: r.eircode,
  gpsLat: r.gps_lat == null ? null : num(r.gps_lat),
  gpsLng: r.gps_lng == null ? null : num(r.gps_lng),
  assignee: mapPerson(r.assignee),
  creator: mapPerson(r.creator),
  vehicle: pickOne(r.vehicle),
});

export async function fetchTasks(): Promise<Task[]> {
  return offlineRead('tasks', async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(SELECT)
      .order('deadline_date', { nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data as TaskRow[]).map(mapTask);
  });
}

export async function fetchTaskDetail(taskId: string): Promise<Task> {
  return offlineRead(`task:${taskId}`, async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(SELECT)
      .eq('id', taskId)
      .single();
    if (error) throw new Error(error.message);
    return mapTask(data as TaskRow);
  });
}

export async function fetchTaskEvents(taskId: string): Promise<TaskEvent[]> {
  const { data, error } = await supabase
    .from('task_events')
    .select('event, note, created_at, actor:business_members(full_name)')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      event: TaskEventKind;
      note: string | null;
      created_at: string;
      actor: { full_name: string | null } | { full_name: string | null }[] | null;
    }[]
  ).map(e => ({
    event: e.event,
    note: e.note,
    createdAt: e.created_at,
    actorName: pickOne(e.actor)?.full_name ?? null,
  }));
}

const TASK_STATUS_ERROR: Record<string, string> = {
  not_allowed: 'You can’t change this task.',
  only_owner_can_edit: 'Only the owner can edit task details.',
  already_complete: 'This task is already complete.',
  invalid_status: 'That change isn’t allowed.',
  not_found: 'This task no longer exists.',
};

const friendlyStatusError = (message: string) => {
  const code = Object.keys(TASK_STATUS_ERROR).find(c => message.includes(c));
  return new Error(code ? TASK_STATUS_ERROR[code] : message);
};

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  note?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_task_status', {
    p_task_id: taskId,
    p_status: status === 'in_progress' ? 'in_progress' : status,
    p_note: note?.trim() || null,
  });
  if (error) throw friendlyStatusError(error.message);
}

export async function addTaskNote(taskId: string, note: string): Promise<void> {
  const me = await getMyMemberRef();
  const { error } = await supabase.from('task_events').insert({
    business_id: me.businessId,
    task_id: taskId,
    event: 'edited',
    note: note.trim(),
    actor_member_id: me.id,
  });
  if (error) {
    throw new Error(
      error.message.includes('row-level security') ||
      error.message.includes('42501')
        ? 'You don’t have permission to add notes to this task.'
        : error.message,
    );
  }
}

export async function fetchAssignableEmployees(): Promise<AssignableEmployee[]> {
  const { data, error } = await supabase
    .from('business_members')
    .select('id, full_name, job_roles(name)')
    .eq('is_employee', true)
    .neq('invite_status', 'removed')
    .order('full_name');
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      id: string;
      full_name: string | null;
      job_roles: { name: string | null } | { name: string | null }[] | null;
    }[]
  ).map(r => ({
    id: r.id,
    name: r.full_name,
    roleName: pickOne(r.job_roles)?.name ?? null,
  }));
}

const CREATE_TASK_ERROR: Record<string, string> = {
  assignee_must_be_employee: 'Pick an active employee to assign this to.',
  '42501': 'You don’t have permission to assign tasks.',
};

export async function createTask(input: NewTaskInput): Promise<string> {
  const me = await getMyMemberRef();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      business_id: me.businessId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      assigned_to: input.assignedTo,
      deadline_date: input.deadlineDate,
      deadline_time: input.deadlineTime || null,
      address: input.address?.trim() || null,
      eircode: input.eircode?.trim() || null,
    })
    .select('id')
    .single();
  if (error) {
    const code = Object.keys(CREATE_TASK_ERROR).find(c =>
      error.message.includes(c),
    );
    throw new Error(code ? CREATE_TASK_ERROR[code] : error.message);
  }
  return (data as { id: string }).id;
}
