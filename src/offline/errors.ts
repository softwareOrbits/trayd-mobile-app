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
