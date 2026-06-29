import {
  addJobMaterial,
  deleteJobMaterial,
  updateJobMaterial,
  type MaterialSource,
} from '@/services/jobs';

import { classifyOutcome } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type MaterialAddPayload = {
  id: string;
  jobId: string;
  description: string;
  quantity: number;
  unitCost: number;
  source: MaterialSource;
  unit?: string | null;
};

export type MaterialUpdatePayload = {
  id: string;
  description?: string;
  quantity?: number;
  unitCost?: number;
  unit?: string | null;
};

export type MaterialDeletePayload = { id: string };

const isDuplicate = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return msg.includes('duplicate key') || msg.includes('already exists');
};

const isMissingRow = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return msg.includes('only edit items') || msg.includes('only remove items');
};

const add = async (p: MaterialAddPayload): Promise<FlushOutcome> => {
  try {
    await addJobMaterial(p);
    return 'done';
  } catch (e) {
    if (isDuplicate(e)) return 'done';
    return classifyOutcome(e);
  }
};

const update = async (p: MaterialUpdatePayload): Promise<FlushOutcome> => {
  try {
    await updateJobMaterial(p.id, {
      description: p.description,
      quantity: p.quantity,
      unitCost: p.unitCost,
      unit: p.unit,
    });
    return 'done';
  } catch (e) {
    if (isMissingRow(e)) return 'done';
    return classifyOutcome(e);
  }
};

const remove = async (p: MaterialDeletePayload): Promise<FlushOutcome> => {
  try {
    await deleteJobMaterial(p.id);
    return 'done';
  } catch (e) {
    if (isMissingRow(e)) return 'done';
    return classifyOutcome(e);
  }
};

export const jobMaterialHandlers: Record<
  Extract<MutationKind, `material.${'add' | 'update' | 'delete'}`>,
  Handler
> = {
  'material.add': p => add(p as MaterialAddPayload),
  'material.update': p => update(p as MaterialUpdatePayload),
  'material.delete': p => remove(p as MaterialDeletePayload),
};
