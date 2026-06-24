import type { Job, JobDetail } from '@/types';
import type { JobMaterial } from '@/services/jobs';

import type { LineItem } from './types';

export const detailFromCachedJob = (j: Job): JobDetail => ({
  id: j.id,
  jobNumber: j.jobNumber,
  jobType: j.jobType,
  status: j.status,
  rawStatus: j.rawStatus,
  scheduledDate: j.scheduledDate,
  scheduledStartTime: j.scheduledStartTime,
  startedAt: null,
  finishedAt: null,
  employerNote: null,
  isCallout: j.jobType === 'callout',
  totalHours: null,
  summary: null,
  createdById: null,
  createdByName: null,
  customerId: j.customerId,
  customerName: j.customerName,
  customerPhone: null,
  customerEmail: null,
  customerAddress: j.customerAddress,
  customerEircode: null,
  primaryMemberId: j.primaryMemberId,
  primaryMemberName: j.primaryMemberName,
  primaryMemberRole: null,
  invoiceTotal: j.invoiceTotal,
});

export const toLineItem = (m: JobMaterial): LineItem => ({
  name:
    m.source === 'receipt'
      ? m.description
      : `${m.description} × ${m.quantity}`,
  tag: m.source === 'receipt' ? 'RECEIPT' : 'VAN STOCK',
  amount: `€${(m.quantity * m.unitCost).toFixed(2)}`,
});

export const fmtDate = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

export const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : null);

export const joinDot = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

export const money = (n: number) => `€${n.toFixed(2)}`;
