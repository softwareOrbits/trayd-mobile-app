import type { FlushOutcome } from './types';

export const isNetworkError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('connection')
  );
};

export const isPermanentError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  if (!msg) return false;
  return (
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('permission') ||
    msg.includes('not authorized') ||
    msg.includes('violates') ||
    msg.includes('duplicate key') ||
    msg.includes('invalid input') ||
    msg.includes('not authenticated') ||
    msg.includes('jwt') ||
    msg.includes('access has been revoked') ||
    msg.includes('not_a_member')
  );
};

export const classifyOutcome = (e: unknown): FlushOutcome => {
  if (isNetworkError(e)) return 'retry';
  if (isPermanentError(e)) return 'drop';
  return 'retry';
};

export const isLifecycleAlreadyApplied = (
  kind: 'pause' | 'resume' | 'finish',
  e: unknown,
): boolean => {
  const msg = e instanceof Error ? e.message : '';
  if (kind === 'pause') return msg.startsWith('Job is not running');
  if (kind === 'resume') return msg.startsWith('Job is not paused');
  return msg.startsWith('This job was already finished');
};

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : 'Unknown error';
