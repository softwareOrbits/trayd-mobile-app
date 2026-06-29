import {
  addJobMaterial,
  deleteJobMaterial,
  updateJobMaterial,
  type JobMaterial,
  type MaterialSource,
} from '@/services/jobs';
import { withTimeout } from '@/utils/withTimeout';
import { uuidv4 } from '@/utils/uuid';

import { isNetworkError } from './errors';
import { enqueue } from './syncEngine';

const MATERIAL_TIMEOUT_MS = 12_000;

export type AddMaterialInput = {
  jobId: string;
  description: string;
  quantity: number;
  unitCost: number;
  source: MaterialSource;
  unit?: string | null;
};

export type MaterialPatch = {
  description?: string;
  quantity?: number;
  unitCost?: number;
  unit?: string | null;
};

export async function addMaterial(
  input: AddMaterialInput,
): Promise<{ queued: boolean; material: JobMaterial }> {
  const id = uuidv4();
  const material: JobMaterial = {
    id,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit ?? null,
    source: input.source,
    unitCost: input.unitCost,
    jobDayId: null,
    addedBy: null,
    createdAt: new Date().toISOString(),
  };
  try {
    await withTimeout(addJobMaterial({ id, ...input }), MATERIAL_TIMEOUT_MS);
    return { queued: false, material };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue({
      id: `material:add:${id}`,
      kind: 'material.add',
      payload: { id, ...input },
    });
    return { queued: true, material };
  }
}

export async function editMaterial(
  id: string,
  patch: MaterialPatch,
): Promise<{ queued: boolean }> {
  try {
    await withTimeout(updateJobMaterial(id, patch), MATERIAL_TIMEOUT_MS);
    return { queued: false };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue({
      id: `material:update:${id}:${Date.now()}`,
      kind: 'material.update',
      payload: { id, ...patch },
    });
    return { queued: true };
  }
}

export async function removeMaterial(
  id: string,
): Promise<{ queued: boolean }> {
  try {
    await withTimeout(deleteJobMaterial(id), MATERIAL_TIMEOUT_MS);
    return { queued: false };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue({
      id: `material:delete:${id}`,
      kind: 'material.delete',
      payload: { id },
    });
    return { queued: true };
  }
}
