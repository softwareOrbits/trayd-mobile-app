import { saveJobCache } from '@/services/jobCache';
import { getMyMemberRef } from '@/services/member';
import type {
  JobCrewMember,
  JobDay,
  JobMaterial,
  JobPhoto,
  JobSegment,
} from '@/services/jobs';
import type { CatalogMaterial } from '@/services/materials';
import { uuidv4 } from '@/utils/uuid';
import type { GpsPoint } from '@/utils/location';
import type { NewCustomerPayload, PhotoAsset } from '@/components/startJob/types';
import type { Job, JobDetail, JobType } from '@/types';

import { enqueue } from './syncEngine';

export type OfflineJobInput = {
  customerId?: string;
  newCustomer?: NewCustomerPayload | null;
  customerName: string;
  customerAddress: string | null;
  jobType: JobType;
  memberIds: string[];
  primaryMemberId: string | null;
  memberName: string | null;
  crew: JobCrewMember[];
  gps?: GpsPoint | null;
  materials: CatalogMaterial[];
  photos: PhotoAsset[];
};

export async function queueOfflineJob(
  input: OfflineJobInput,
): Promise<{ jobId: string; job: Job }> {
  const tempJobId = uuidv4();
  const now = new Date().toISOString();
  const stamp = Date.now();
  const me = await getMyMemberRef().catch(() => null);

  await enqueue({
    id: `job:start:${tempJobId}`,
    kind: 'job.start',
    payload: {
      tempJobId,
      customerId: input.customerId,
      newCustomer: input.newCustomer ?? undefined,
      jobType: input.jobType,
      memberIds: input.memberIds,
      gps: input.gps ?? undefined,
      startedAt: now,
    },
  });

  const materials: JobMaterial[] = [];
  for (const m of input.materials) {
    const id = uuidv4();
    materials.push({
      id,
      description: m.name,
      quantity: 1,
      unit: m.unit,
      source: 'van_stock',
      unitCost: m.sellPrice,
      jobDayId: null,
      addedBy: null,
      createdAt: now,
    });
    await enqueue({
      id: `material:add:${id}`,
      kind: 'material.add',
      payload: {
        id,
        jobId: tempJobId,
        description: m.name,
        quantity: 1,
        unitCost: m.sellPrice,
        source: 'van_stock',
        unit: m.unit,
      },
    });
  }

  const photoItems = input.photos
    .filter(p => p.uri)
    .map((p, i) => ({
      phase: 'before' as const,
      uri: p.uri,
      base64: p.base64,
      type: p.type,
      clientKey: `${tempJobId}-${stamp}-${i}`,
    }));
  if (photoItems.length) {
    await enqueue({
      id: `${tempJobId}:photos:${stamp}`,
      kind: 'job.addPhotos',
      payload: {
        clientId: `${tempJobId}-${stamp}`,
        jobId: tempJobId,
        photos: photoItems,
      },
    });
  }

  const job: Job = {
    id: tempJobId,
    jobNumber: null,
    jobType: input.jobType,
    status: 'active',
    rawStatus: 'active',
    scheduledDate: null,
    scheduledStartTime: null,
    createdAt: now,
    updatedAt: now,
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerAddress: input.customerAddress,
    customerEircode: input.newCustomer?.eircode ?? null,
    primaryMemberId: input.primaryMemberId,
    primaryMemberName: input.memberName,
    invoiceTotal: 0,
    lastActivityAt: now,
  };

  const detail: JobDetail = {
    id: tempJobId,
    jobNumber: null,
    jobType: input.jobType,
    status: 'active',
    rawStatus: 'active',
    scheduledDate: null,
    scheduledStartTime: null,
    startedAt: now,
    finishedAt: null,
    employerNote: null,
    isCallout: input.jobType === 'callout',
    totalHours: null,
    summary: null,
    createdById: null,
    createdByName: null,
    customerId: input.customerId ?? null,
    customerName: input.customerName,
    customerPhone: input.newCustomer?.phone ?? null,
    customerEmail: input.newCustomer?.email ?? null,
    customerAddress: input.customerAddress,
    customerEircode: input.newCustomer?.eircode ?? null,
    primaryMemberId: input.primaryMemberId,
    primaryMemberName: input.memberName,
    primaryMemberRole: null,
    invoiceTotal: 0,
  };

  const dayId = uuidv4();
  const day: JobDay = {
    id: dayId,
    dayNumber: 1,
    workDate: now.slice(0, 10),
    startedAt: now,
    finishedAt: null,
  };
  const segment: JobSegment = {
    id: uuidv4(),
    jobDayId: dayId,
    memberId: me?.id ?? input.primaryMemberId ?? '',
    startTime: now,
    finishTime: null,
    hours: null,
  };

  const photos: JobPhoto[] = photoItems.map(it => ({
    id: it.clientKey,
    phase: it.phase,
    takenAt: now,
    url: it.uri,
    storagePath: '',
  }));

  await saveJobCache(tempJobId, {
    detail,
    materials,
    segments: [segment],
    days: [day],
    notes: [],
    photos,
    crew: input.crew,
  });

  return { jobId: tempJobId, job };
}
