import { acquirePhotos } from './capturePhoto';

export type PickedAttachment = {
  base64: string;
  mediaType: string;
  name: string;
  previewUri: string;
};

const photoName = (type?: string | null) =>
  `photo-${Date.now()}.${(type ?? 'image/jpeg').split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'}`;

export async function pickAttachments(limit: number): Promise<PickedAttachment[]> {
  if (limit <= 0) return [];
  const photos = await acquirePhotos({ selectionLimit: limit });
  return photos.map(p => ({
    base64: p.base64,
    mediaType: p.type ?? 'image/jpeg',
    name: photoName(p.type),
    previewUri: p.uri,
  }));
}
