export const firstNameOf = (fullName?: string | null): string => {
  const name = (fullName ?? '').trim();
  return name ? name.split(/\s+/)[0] : '';
};

export const initialsOf = (fullName?: string | null): string => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
};
