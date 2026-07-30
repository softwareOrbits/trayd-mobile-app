export type TimesheetDay = {
  date: string;
  jobCount: number;
  taskCount: number;
  totalHours: number;
  leave?: string;
};

export type Timesheet = {
  totalHours: number;
  running: boolean;
  days: TimesheetDay[];
};
