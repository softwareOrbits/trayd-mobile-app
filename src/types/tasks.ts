export type TaskStatus = 'assigned' | 'in_progress' | 'complete';

export type TaskTabKey = 'upcoming' | 'live' | 'completed';

export const TASK_TAB_STATUS: Record<TaskTabKey, TaskStatus> = {
  upcoming: 'assigned',
  live: 'in_progress',
  completed: 'complete',
};

export type TaskPerson = {
  id: string;
  name: string | null;
  isOwner: boolean;
};

export type TaskVehicle = {
  registration: string | null;
  make: string | null;
  model: string | null;
};

export type Task = {
  id: string;
  taskNumber: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadlineDate: string | null;
  deadlineTime: string | null;
  address: string | null;
  eircode: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  assignee: TaskPerson | null;
  creator: TaskPerson | null;
  vehicle: TaskVehicle | null;
};

export type TaskEventKind =
  | 'assigned'
  | 'started'
  | 'completed'
  | 'reopened'
  | 'edited'
  | 'note';

export type TaskEvent = {
  event: TaskEventKind;
  note: string | null;
  createdAt: string;
  actorName: string | null;
};

export type TaskPeriod = { year: number; month: number };

export type AssignableEmployee = {
  id: string;
  name: string | null;
  roleName: string | null;
};

export type NewTaskInput = {
  title: string;
  description: string | null;
  assignedTo: string;
  deadlineDate: string;
  deadlineTime: string | null;
  address: string | null;
  eircode: string | null;
};
