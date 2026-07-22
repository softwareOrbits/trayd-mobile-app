import type { IconName } from './theme';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'closed';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'other';

export const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'casual', 'other'];

export const LEAVE_STATUSES: LeaveStatus[] = [
  'pending',
  'approved',
  'rejected',
  'closed',
];

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  casual: 'Casual',
  other: 'Other',
};

export const LEAVE_TYPE_LABEL_LONG: Record<LeaveType, string> = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  other: 'Other leave',
};

export const LEAVE_TYPE_ICON: Record<LeaveType, IconName> = {
  annual: 'sunny-outline',
  sick: 'medkit-outline',
  casual: 'cafe-outline',
  other: 'ellipsis-horizontal',
};

export const LEAVE_TYPE_TAGLINE: Record<LeaveType, string> = {
  annual: 'paid · uses days',
  sick: 'notifies now',
  casual: 'short notice',
  other: 'unpaid · misc',
};

export const LEAVE_TYPE_CAPTION: Partial<Record<LeaveType, string>> = {
  other: 'UNPAID · COMPASSIONATE',
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
};

export type LeaveBalanceFraming = 'left' | 'used' | 'taken';

export const LEAVE_BALANCE_FRAMING: Record<LeaveType, LeaveBalanceFraming> = {
  annual: 'left',
  sick: 'used',
  casual: 'left',
  other: 'taken',
};

export type LeaveBalance = {
  type: LeaveType;
  used: number;
  pending: number;
  entitlement: number;
  year: number;
};

export type LeaveRequest = {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  note: string | null;
  ownNote?: string | null;
  decisionNote?: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type LeaveTypeFilter = LeaveType | 'all';
export type LeaveStatusFilter = LeaveStatus | 'all';

export type LeaveRequestDraft = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  note: string;
  documentPath?: string;
};
