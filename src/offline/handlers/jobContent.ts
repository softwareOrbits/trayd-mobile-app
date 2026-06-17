import { addJobNote, type NoteVisibility } from '@/services/jobs';

import { isNetworkError } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type AddNotePayload = {
  clientId: string;
  jobId: string;
  body: string;
  visibility: NoteVisibility;
};

const addNote: Handler<AddNotePayload> = async (p): Promise<FlushOutcome> => {
  try {
    await addJobNote(p.jobId, p.body, p.visibility);
    return 'done';
  } catch (e) {
    return isNetworkError(e) ? 'retry' : 'drop';
  }
};

export const jobContentHandlers: Record<
  Extract<MutationKind, 'job.addNote'>,
  Handler<AddNotePayload>
> = {
  'job.addNote': addNote,
};
