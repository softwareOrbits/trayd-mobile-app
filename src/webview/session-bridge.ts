import type { Session } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/config/environment';

/**
 * Bridge between the native app and the employer dashboard rendered in a WebView.
 *
 * The web app is a Supabase SPA that decides auth from `getSession()` on boot,
 * which synchronously reads `localStorage[storageKey]`. Both apps run the same
 * `@supabase/supabase-js` version, so the stored session shape is identical and
 * we can seed the WebView's localStorage verbatim — no re-login, no /login flash.
 */

/** Message types the WEB posts back to native via `ReactNativeWebView.postMessage`. */
export const NativeMessage = {
  /** Web bundle has mounted and hydrated — safe to hide the loading veil. */
  READY: 'READY',
  /** Web-initiated sign-out (e.g. OwnerGuard bounced a non-owner). */
  SIGNED_OUT: 'SIGNED_OUT',
  /**
   * The web's route guard found no session and would otherwise render its own
   * `/login`. Native owns sign-in, so the shell re-seeds and reloads instead.
   */
  AUTH_LOST: 'AUTH_LOST',
  SWITCH_VIEW: 'SWITCH_VIEW',
  /** Web wants the native share sheet for a generated PDF. */
  SAVE_PDF: 'SAVE_PDF',
  SAVE_FILE: 'SAVE_FILE',
  PREVIEW_FILE: 'PREVIEW_FILE',
  HAPTIC: 'HAPTIC',
  WEB_ERROR: 'WEB_ERROR',
} as const;

export type NativeInboundMessage =
  | { type: typeof NativeMessage.READY }
  | { type: typeof NativeMessage.SIGNED_OUT }
  | { type: typeof NativeMessage.AUTH_LOST }
  | { type: typeof NativeMessage.SWITCH_VIEW }
  | { type: typeof NativeMessage.SAVE_PDF; filename: string; base64: string }
  | {
      type: typeof NativeMessage.SAVE_FILE;
      filename: string;
      base64: string;
      mimeType?: string;
    }
  | {
      type: typeof NativeMessage.PREVIEW_FILE;
      filename: string;
      base64: string;
      mimeType?: string;
    }
  | { type: typeof NativeMessage.HAPTIC; style?: 'light' | 'medium' | 'success' | 'warning' }
  | {
      type: typeof NativeMessage.WEB_ERROR;
      source?: string;
      where?: string;
      message?: string;
      code?: string;
      route?: string;
      stack?: string;
    };

/**
 * Supabase derives its auth storage key from the project ref (the first label of
 * the Supabase URL host): `sb-<ref>-auth-token`. Derived at runtime so a change
 * of `SUPABASE_URL` can never desync it from the web client's key.
 */
export function authStorageKey(): string {
  const ref = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
  return `sb-${ref}-auth-token`;
}

/** Serialise a value so it is safe to embed inside injected JS as a string literal. */
const asJsString = (value: string): string => JSON.stringify(value);

const LOCK_VIEWPORT_JS = `(function(){try{
  var CONTENT = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';
  function apply(){
    var metas = document.querySelectorAll('meta[name="viewport"]');
    if (!metas.length) {
      var m = document.createElement('meta');
      m.setAttribute('name', 'viewport');
      m.setAttribute('content', CONTENT);
      (document.head || document.documentElement).appendChild(m);
      return;
    }
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', CONTENT);
  }
  apply();
  document.addEventListener('DOMContentLoaded', apply);
}catch(e){}})();`;

const CAPTURE_DOWNLOADS_JS = `(function(){try{
  if (window.__traydDownloads) return;
  window.__traydDownloads = true;
  var blobs = {};
  var create = URL.createObjectURL.bind(URL);
  var revoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function(obj){
    var url = create(obj);
    if (obj instanceof Blob) blobs[url] = obj;
    return url;
  };
  URL.revokeObjectURL = function(url){
    setTimeout(function(){ delete blobs[url]; }, 60000);
    revoke(url);
  };
  function send(blob, filename){
    var reader = new FileReader();
    reader.onloadend = function(){
      var result = typeof reader.result === 'string' ? reader.result : '';
      var comma = result.indexOf(',');
      if (comma < 0) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'SAVE_FILE',
        filename: filename,
        base64: result.slice(comma + 1),
        mimeType: blob.type || 'application/octet-stream'
      }));
    };
    reader.readAsDataURL(blob);
  }
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    var href = this.href || '';
    var name = this.getAttribute('download');
    if (name !== null && href.indexOf('blob:') === 0 && blobs[href]) {
      send(blobs[href], name || 'download');
      return;
    }
    if (name !== null && href.indexOf('data:') === 0) {
      var anchor = this;
      fetch(href).then(function(r){ return r.blob(); }).then(function(b){ send(b, anchor.getAttribute('download') || 'download'); });
      return;
    }
    return click.apply(this, arguments);
  };
}catch(e){}})();`;

/**
 * Runs at document-start (`injectedJavaScriptBeforeContentLoaded`) on every load
 * and reload, BEFORE the web bundle executes. Flags the native shell and seeds
 * the session so the very first `getSession()` finds it.
 */
export function buildBootstrapScript(session: Session, bottomInset = 0): string {
  const key = asJsString(authStorageKey());
  const value = asJsString(JSON.stringify(session));
  const bottom = Math.max(0, Math.round(bottomInset));
  return `(function(){try{
    window.__TRAYD_NATIVE__ = true;
    localStorage.setItem(${key}, ${value});
  }catch(e){}})();
  (function(){try{
    document.documentElement.style.setProperty('--native-safe-bottom', '${bottom}px');
  }catch(e){}})();
  ${LOCK_VIEWPORT_JS}
  ${CAPTURE_DOWNLOADS_JS}
  true;`;
}

/**
 * Live-pushes a refreshed session into an already-loaded WebView. Updates the
 * web client through its own `setSession` (so React state + future auto behaviour
 * stay correct) and also rewrites localStorage as a reload-safe fallback.
 */
export function buildSessionPushScript(session: Session): string {
  const key = asJsString(authStorageKey());
  const value = asJsString(JSON.stringify(session));
  const payload = JSON.stringify({
    type: 'SESSION',
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  return `(function(){try{
    localStorage.setItem(${key}, ${value});
    if (window.__traydOnMessage) { window.__traydOnMessage(${payload}); }
  }catch(e){}})();
  true;`;
}

/**
 * Clears the stored session from the WebView before it unmounts on sign-out, so
 * its persistent data store can't boot a stale session on the next open.
 *
 * Deliberately does NOT trigger the web app's own sign-out: that would redirect
 * the WebView to its `/login` and flash it before the native app tears the
 * WebView down. The WebView unmounts on logout, so its in-memory session dies
 * with it — clearing storage is enough to keep the next open clean.
 */
export function buildSignOutScript(): string {
  const key = asJsString(authStorageKey());
  return `(function(){try{
    localStorage.removeItem(${key});
  }catch(e){}})();
  true;`;
}
