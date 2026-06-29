import { editSegmentFinishTime, editSegmentStartTime } from '@/services/jobs';

import { classifyOutcome } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type SegmentEditPayload = {
  jobId?: string;
  entryId: string;
  startIso?: string;
  finishIso?: string;
  reason?: string | null;
};

const edit = async (p: SegmentEditPayload): Promise<FlushOutcome> => {
  try {
    if (p.startIso) {
      await editSegmentStartTime(p.entryId, p.startIso, p.reason ?? null);
    }
    if (p.finishIso) {
      await editSegmentFinishTime(p.entryId, p.finishIso, p.reason ?? null);
    }
    return 'done';
  } catch (e) {
    return classifyOutcome(e);
  }
};

export const segmentHandlers: Record<
  Extract<MutationKind, 'segment.edit'>,
  Handler
> = {
  'segment.edit': p => edit(p as SegmentEditPayload),
};
