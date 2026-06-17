import type { Handler, MutationKind } from '../types';
import { jobContentHandlers } from './jobContent';
import { jobLifecycleHandlers } from './jobLifecycle';
import { profileHandlers } from './profile';

export const handlers: Record<MutationKind, Handler> = {
  ...jobLifecycleHandlers,
  ...jobContentHandlers,
  ...profileHandlers,
} as Record<MutationKind, Handler>;
