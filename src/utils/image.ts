/**
 * Image MIME / extension helpers for storage uploads.
 *
 * The image picker can report non-canonical types — notably `image/jpg` on
 * iOS, which is NOT a real MIME type. Buckets with an allowed-MIME list reject
 * it, so always normalise the declared `contentType` through `imageMimeFromType`
 * (jpg/heic/unknown → `image/jpeg`).
 */
export const imageExtFromType = (type?: string | null) => {
  if (type?.includes('png')) return 'png';
  if (type?.includes('webp')) return 'webp';
  return 'jpg';
};

export const imageMimeFromType = (type?: string | null) => {
  if (type?.includes('png')) return 'image/png';
  if (type?.includes('webp')) return 'image/webp';
  return 'image/jpeg';
};
