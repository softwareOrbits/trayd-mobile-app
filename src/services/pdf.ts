import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';

/** Strip characters that aren't safe in a filename. */
const safeName = (name: string): string =>
  name.replace(/[^\w.\- ]+/g, '_').trim() || 'document.pdf';

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
  const name = safeName(filename);
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${name}`;
  await ReactNativeBlobUtil.fs.writeFile(path, base64, 'base64');
  try {
    await Share.open({
      url: `file://${path}`,
      type: 'application/pdf',
      filename: name,
      failOnCancel: false,
    });
  } catch {
    // User dismissed the share sheet — not an error.
  }
}
