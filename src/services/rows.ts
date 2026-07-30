export const pickOne = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

export const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === 'string' ? parseFloat(v) || 0 : v;

export const numOrNull = (
  v: number | string | null | undefined,
): number | null =>
  v == null ? null : typeof v === 'string' ? parseFloat(v) || null : v;
