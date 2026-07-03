import type { Session } from '@supabase/supabase-js';
import { buildSessionPushScript, buildSignOutScript } from './session-bridge';

/**
 * A tiny module-level handle to the mounted employer WebView so code outside the
 * React tree (the global `onAuthStateChange` in App.tsx, the sign-out thunk) can
 * push a refreshed session in or clear it without prop-drilling a ref.
 */
type WebViewControls = {
  injectJavaScript: (script: string) => void;
  reload: () => void;
};

let controls: WebViewControls | null = null;

export function registerEmployerWebView(next: WebViewControls): void {
  controls = next;
}

export function unregisterEmployerWebView(prev: WebViewControls): void {
  // Only clear if the current handle is still the one unmounting (avoids a
  // remount race clobbering a freshly-registered instance).
  if (controls === prev) controls = null;
}

export function hasEmployerWebView(): boolean {
  return controls !== null;
}

/** Push a refreshed session into the open WebView (keeps it alive past expiry). */
export function pushSessionToWebView(session: Session): void {
  controls?.injectJavaScript(buildSessionPushScript(session));
}

/** Wipe the WebView's session before it unmounts on sign-out. */
export function clearWebViewSession(): void {
  controls?.injectJavaScript(buildSignOutScript());
}

/** Force a reload (e.g. after returning from external Stripe checkout). */
export function reloadWebView(): void {
  controls?.reload();
}
