import type { TaskStatus } from './tasks';

export type Vehicle = {
  id: string;
  registration: string;
  year: number | null;
  make: string | null;
  model: string | null;
  colour: string | null;
  status: string;
  odometerKm: number | null;
  nctExpiry: string | null;
  motorTaxExpiry: string | null;
  lastServiceOn: string | null;
  nextServiceDue: string | null;
};

export type VanIssueKind = 'issue' | 'damage' | 'service' | 'other';

export type VanIssue = {
  id: string;
  issueNumber: string;
  kind: string;
  description: string;
  drivable: boolean;
  status: string;
  photoPaths: string[];
  reportedById: string | null;
  reportedByName: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type VanMaintenanceEntry = {
  id: string;
  entryType: string;
  entryDate: string;
  mileageKm: number | null;
  description: string;
  nextTimeNotes: string | null;
  cost: number | null;
  loggedByName: string | null;
  issueId: string | null;
};

export type VanTask = {
  id: string;
  taskNumber: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  deadlineDate: string | null;
  creatorName: string | null;
};

export type VanLog = {
  vehicle: Vehicle;
  issues: VanIssue[];
  maintenance: VanMaintenanceEntry[];
  tasks: VanTask[];
};

export type NewVanIssuePhoto = {
  base64: string;
  type?: string | null;
};

export type NewVanIssueInput = {
  vehicleId: string;
  kind: VanIssueKind;
  description: string;
  drivable: boolean;
  photos: NewVanIssuePhoto[];
};

export type VanLogFilter = 'all' | 'issues' | 'tasks' | 'service';
