/** Heuristic: did this error come from a failed/timed-out network call? */
export const isNetworkError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout')
  );
};
