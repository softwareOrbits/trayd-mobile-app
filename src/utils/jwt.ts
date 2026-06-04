const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Minimal base64 decoder so we don't depend on a global `atob`
// (Hermes does not polyfill it).
function base64Decode(input: string): string {
  const str = input.replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = B64_ALPHABET.indexOf(str[i]);
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

/**
 * Decodes the payload of a JWT without verifying its signature. Only use on
 * tokens received over a trusted channel (e.g. straight from Supabase auth).
 */
export function getJwtClaims(
  token: string | null | undefined,
): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(base64Decode(normalised));
  } catch {
    return null;
  }
}
