export const formatDuration = (hours: number) => {
  const totalMin = Math.round(hours * 60);
  const d = Math.floor(totalMin / 1440);
  const hh = Math.floor((totalMin % 1440) / 60);
  const mm = totalMin % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (hh) parts.push(`${hh}h`);
  if (mm || !parts.length) parts.push(`${mm}m`);
  return parts.join(' ');
};
