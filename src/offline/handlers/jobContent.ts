import {
  addJobNote,
  addJobPhotos,
  type JobPhotoInput,
  type NoteVisibility,
} from '@/services/jobs';

import { isNetworkError } from '../errors';
import type { FlushOutcome, Handler, MutationKind } from '../types';

export type AddNotePayload = {
  clientId: string;
  jobId: string;
  body: string;
  visibility: NoteVisibility;
};

export type AddPhotosPayload = {
  clientId: string;
  jobId: string;
  photos: JobPhotoInput[];
};

const addNote: Handler<AddNotePayload> = async (p): Promise<FlushOutcome> => {
  try {
    await addJobNote(p.jobId, p.body, p.visibility);
    return 'done';
  } catch (e) {
    return isNetworkError(e) ? 'retry' : 'drop';
  }
};

const addPhotos: Handler<AddPhotosPayload> = async (p): Promise<FlushOutcome> => {
  try {
    const { uploaded } = await addJobPhotos({ jobId: p.jobId, photos: p.photos });
    return uploaded ? 'done' : 'retry';
  } catch (e) {
    return isNetworkError(e) ? 'retry' : 'drop';
  }
};

export const jobContentHandlers: Record<
  Extract<MutationKind, 'job.addNote' | 'job.addPhotos'>,
  Handler
> = {
  'job.addNote': addNote as Handler,
  'job.addPhotos': addPhotos as Handler,
};
