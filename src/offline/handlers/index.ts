import type { Handler, MutationKind } from '../types';
import { jobContentHandlers } from './jobContent';
import { jobLifecycleHandlers } from './jobLifecycle';
import { jobMaterialHandlers } from './jobMaterials';
import { jobStartHandlers } from './jobStart';
import { profileHandlers } from './profile';
import { segmentHandlers } from './segments';

export const handlers: Record<MutationKind, Handler> = {
  ...jobStartHandlers,
  ...jobLifecycleHandlers,
  ...jobContentHandlers,
  ...jobMaterialHandlers,
  ...segmentHandlers,
  ...profileHandlers,
} as Record<MutationKind, Handler>;
