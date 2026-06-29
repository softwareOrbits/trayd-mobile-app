import {
  updateMyPhone,
  updateMyServiceArea,
  updateMyWorkingHours,
  type ServiceArea,
  type WorkingHours,
} from '@/services/member';

import { classifyOutcome } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

const run = async (fn: () => Promise<unknown>): Promise<FlushOutcome> => {
  try {
    await fn();
    return 'done';
  } catch (e) {
    return classifyOutcome(e);
  }
};

export type PhonePayload = { phone: string };
export type WorkingHoursPayload = { hours: WorkingHours };
export type ServiceAreaPayload = { area: ServiceArea };

export const profileHandlers: Record<
  Extract<MutationKind, `profile.${string}`>,
  Handler
> = {
  'profile.phone': p => run(() => updateMyPhone((p as PhonePayload).phone)),
  'profile.workingHours': p =>
    run(() => updateMyWorkingHours((p as WorkingHoursPayload).hours)),
  'profile.serviceArea': p =>
    run(() => updateMyServiceArea((p as ServiceAreaPayload).area)),
};
