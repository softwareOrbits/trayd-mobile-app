export type AvatarTone = { bg: string; fg: string };

const TONES: AvatarTone[] = [
  { bg: '#FBF1DD', fg: '#B7791F' },
  { bg: '#E8EEF7', fg: '#16345A' },
  { bg: '#E5F0E9', fg: '#017636' },
  { bg: '#FBEAEA', fg: '#D14343' },
  { bg: '#EDE7F6', fg: '#6A4FA3' },
  { bg: '#E0F2F4', fg: '#0E7490' },
  { bg: '#FDE8DC', fg: '#C05621' },
  { bg: '#EEF2E4', fg: '#5F7A1F' },
];

export const avatarToneFor = (name: string | null | undefined): AvatarTone => {
  const key = (name ?? '').trim().toLowerCase();
  if (!key) return TONES[1];
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
};
