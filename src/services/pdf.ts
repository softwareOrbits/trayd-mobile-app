import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

/** Strip characters that aren't safe in a filename. */
const safeName = (name: string): string =>
  name.replace(/[^\w.\- ]+/g, '_').trim() || 'document.pdf';

export async function saveFileAndShare(
  filename: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const name = safeName(filename);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
  await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');
  try {
    await Share.open({
      url: `file://${path}`,
      type: mimeType,
      filename: name,
      failOnCancel: false,
    });
  } catch {
    // User dismissed the share sheet — not an error.
  }
}

export async function previewFile(
  filename: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const name = safeName(filename);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
  await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');
  try {
    if (Platform.OS === 'ios') {
      await ReactNativeBlobUtil.ios.openDocument(path);
    } else {
      await ReactNativeBlobUtil.android.actionViewIntent(path, mimeType);
    }
  } catch {
    await saveFileAndShare(filename, base64, mimeType);
  }
}

/**
 * The employer dashboard generates invoice PDFs client-side as a Blob; the web's
 * `<a download>` path silently fails inside a WKWebView, so when embedded it hands
 * us the PDF as base64. We write it to the cache dir and open the native share
 * sheet (save to Files, AirDrop, email, etc.).
 */
export async function savePdfAndShare(
  filename: string,
  base64: string,
): Promise<void> {
  return saveFileAndShare(filename, base64, 'application/pdf');
}
