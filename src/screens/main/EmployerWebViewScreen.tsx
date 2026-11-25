import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewProps,
} from 'react-native-webview';
import Ionicons from '@react-native-vector-icons/ionicons';
import { WEB_APP_URL } from '@/config/environment';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  refreshAccessViews,
  setSelectedView,
  signOut,
} from '@/store/authSlice';
import type { MainStackParamList } from '@/types';
import { supabase } from '@/services/supabase';
import { previewFile, saveFileAndShare, savePdfAndShare } from '@/services/pdf';
import { haptics } from '@/utils/haptics';
import {
  buildBootstrapScript,
  HEALTH_CHECK_JS,
  NativeMessage,
  type NativeInboundMessage,
} from '@/webview/session-bridge';
import {
  pushSessionToWebView,
  registerEmployerWebView,
  reloadWebView,
  unregisterEmployerWebView,
} from '@/webview/webviewRegistry';
import { useWebDictationBridge } from '@/webview/useWebDictationBridge';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

// react-native-webview@14's class type defaults its generic to `undefined`, so
// its props resolve to `WebViewProps & undefined` = `never` under @types/react 19
// and every JSX prop errors. Alias to a component typed with the real props; the
// ref still targets the class instance where the imperative methods live.
const TypedWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebView> }
>;

type ShouldStartLoad = NonNullable<WebViewProps['onShouldStartLoadWithRequest']>;

const TAP_HAPTIC_GAP_MS = 120;
const HEALTH_RETRY_MS = 2000;
const HEALTH_TIMEOUT_MS = 4500;
const REVEAL_CHECK_MS = 12000;
const LOAD_TIMEOUT_MS = 20000;
const CRASH_WINDOW_MS = 60000;
const MAX_CRASHES = 3;

/** Host of a URL without pulling in a URL polyfill: `https://a.b/c` → `a.b`. */
const hostOf = (url: string): string => url.split('/')[2] ?? '';

/** Path of a URL, query and hash stripped: `https://a.b/login?x=1` → `/login`. */
const pathOf = (url: string): string =>
  `/${url.split('/').slice(3).join('/').split('?')[0].split('#')[0]}`.replace(
    /\/+$/,
    '',
  ) || '/';

/**
 * The dashboard's own auth routes. Native owns sign-in — the employer is already
 * signed in before this screen mounts — so the WebView landing on one of these
 * always means its seeded session was rejected, never a screen to show.
 */
const WEB_AUTH_ROUTES = [
  '/login',
  '/signup',
  '/auth/forgot',
  '/auth/reset',
  '/auth/accept-invite',
];

const isWebAuthRoute = (url: string): boolean => {
  const path = pathOf(url);
  return WEB_AUTH_ROUTES.some(
    route => path === route || path.startsWith(`${route}/`),
  );
};

const EmployerWebViewScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const bottomInsetRef = useRef(insets.bottom);
  bottomInsetRef.current = insets.bottom;
  const dispatch = useAppDispatch();
  const employeeView = useAppSelector(s => s.auth.employeeView);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const openedExternal = useRef(false);
  const lastTapHaptic = useRef(0);

  const [bootstrap, setBootstrap] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sourceUri, setSourceUri] = useState(WEB_APP_URL);
  const injectIntoWeb = useCallback(
    (script: string) => webRef.current?.injectJavaScript(script),
    [],
  );
  const handleWebDictate = useWebDictationBridge(injectIntoWeb);

  const recovering = useRef(false);
  const reseeded = useRef(false);
  const signingOut = useRef(false);
  const readyRef = useRef(false);
  readyRef.current = ready;
  const lastUrl = useRef(WEB_APP_URL);
  const processGone = useRef(false);
  const crashTimes = useRef<number[]>([]);
  const healthTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const configured = !!WEB_APP_URL;

  const clearHealthCheck = useCallback(() => {
    healthTimers.current.forEach(clearTimeout);
    healthTimers.current = [];
  }, []);

  const remountWebView = useCallback(async () => {
    if (recovering.current || signingOut.current) return;
    recovering.current = true;
    processGone.current = false;
    clearHealthCheck();
    setLoadError(null);
    setReady(false);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        const url = lastUrl.current;
        const canResume =
          crashTimes.current.length < 2 &&
          hostOf(url) === hostOf(WEB_APP_URL) &&
          !isWebAuthRoute(url);
        setSourceUri(canResume ? url : WEB_APP_URL);
        setBootstrap(buildBootstrapScript(data.session, bottomInsetRef.current));
        setSeedKey(key => key + 1);
      } else if (error) {
        setLoadError('Check your connection and try again.');
      } else {
        signingOut.current = true;
        dispatch(signOut());
      }
    } catch {
      setLoadError('Check your connection and try again.');
    } finally {
      recovering.current = false;
    }
  }, [clearHealthCheck, dispatch]);

  const checkWebViewAlive = useCallback(() => {
    if (!readyRef.current) return;
    clearHealthCheck();
    injectIntoWeb(HEALTH_CHECK_JS);
    healthTimers.current = [
      setTimeout(() => injectIntoWeb(HEALTH_CHECK_JS), HEALTH_RETRY_MS),
      setTimeout(() => remountWebView(), HEALTH_TIMEOUT_MS),
    ];
  }, [clearHealthCheck, injectIntoWeb, remountWebView]);

  const onWebProcessGone = useCallback(() => {
    const now = Date.now();
    crashTimes.current = [
      ...crashTimes.current.filter(t => now - t < CRASH_WINDOW_MS),
      now,
    ];
    clearHealthCheck();
    processGone.current = true;
    setReady(false);
    if (crashTimes.current.length >= MAX_CRASHES) {
      setLoadError('The dashboard stopped working. Try again.');
      return;
    }
    if (AppState.currentState === 'active') remountWebView();
  }, [clearHealthCheck, remountWebView]);

  const retry = useCallback(() => {
    crashTimes.current = [];
    remountWebView();
  }, [remountWebView]);

  useEffect(() => {
    remountWebView();
    return clearHealthCheck;
  }, [remountWebView, clearHealthCheck]);

  // Expose this WebView to code outside the tree (token-refresh push, teardown).
  useEffect(() => {
    const controls = {
      injectJavaScript: (script: string) => webRef.current?.injectJavaScript(script),
      reload: () => webRef.current?.reload(),
    };
    registerEmployerWebView(controls);
    return () => unregisterEmployerWebView(controls);
  }, []);

  useEffect(() => {
    if (ready || loadError || !bootstrap) return;
    const probe = setTimeout(() => injectIntoWeb(HEALTH_CHECK_JS), REVEAL_CHECK_MS);
    const giveUp = setTimeout(
      () => setLoadError('The dashboard is taking too long to load.'),
      LOAD_TIMEOUT_MS,
    );
    return () => {
      clearTimeout(probe);
      clearTimeout(giveUp);
    };
  }, [ready, loadError, bootstrap, seedKey, injectIntoWeb]);

  // On foreground: refresh the web session and reload if we came back from an
  // external (Stripe) hop so the dashboard reflects the new state.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        clearHealthCheck();
        return;
      }
      reseeded.current = false;
      if (processGone.current) {
        openedExternal.current = false;
        if (crashTimes.current.length < MAX_CRASHES) remountWebView();
        return;
      }
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (data.session) pushSessionToWebView(data.session);
        })
        .catch(() => undefined);
      if (openedExternal.current) {
        openedExternal.current = false;
        reloadWebView();
        return;
      }
      checkWebViewAlive();
    });
    return () => sub.remove();
  }, [checkWebViewAlive, clearHealthCheck, remountWebView]);

  // Android hardware back: navigate WebView history, else return to the chooser.
  // Skip when a screen is pushed on top (Notifications/JobDetail) so the native
  // stack can pop it first.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBack = () => {
      if (!navigation.isFocused()) return false;
      if (canGoBackRef.current) {
        webRef.current?.goBack();
        return true;
      }
      if (!employeeView) return false;
      dispatch(setSelectedView(null));
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [dispatch, navigation, employeeView]);

  /**
   * The dashboard fell back to its own sign-in. Almost always its seeded session
   * went stale — native rotates the refresh token on its own schedule, which
   * invalidates the copy the WebView booted with. Re-seed from the live native
   * session and remount so the bootstrap runs again with fresh tokens. If it
   * happens a second time the session is genuinely gone, so hand back to the
   * native login rather than leaving the web one on screen.
   */
  const recoverWebSession = useCallback(() => {
    if (recovering.current || signingOut.current) return;
    if (reseeded.current) {
      signingOut.current = true;
      setReady(false);
      dispatch(signOut());
      return;
    }
    reseeded.current = true;
    remountWebView();
  }, [dispatch, remountWebView]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: NativeInboundMessage;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case NativeMessage.READY:
          setLoadError(null);
          setReady(true);
          break;
        case NativeMessage.ALIVE:
          if (!msg.ok) break;
          clearHealthCheck();
          setReady(true);
          break;
        case NativeMessage.SIGNED_OUT:
          // Cover the WebView so a web-side /login redirect isn't visible while
          // the native app tears the screen down.
          signingOut.current = true;
          setReady(false);
          dispatch(signOut());
          break;
        case NativeMessage.AUTH_LOST:
          recoverWebSession();
          break;
        case NativeMessage.SWITCH_VIEW:
          dispatch(refreshAccessViews()).finally(() =>
            dispatch(setSelectedView('field')),
          );
          break;
        case NativeMessage.REFRESH_SESSION:
          dispatch(refreshAccessViews());
          supabase.auth.refreshSession().catch(() => undefined);
          break;
        case NativeMessage.SAVE_PDF:
          savePdfAndShare(msg.filename, msg.base64).catch(() => undefined);
          break;
        case NativeMessage.SAVE_FILE:
          saveFileAndShare(
            msg.filename,
            msg.base64,
            msg.mimeType ?? 'application/octet-stream',
          ).catch(() => undefined);
          break;
        case NativeMessage.PREVIEW_FILE:
          previewFile(
            msg.filename,
            msg.base64,
            msg.mimeType ?? 'application/pdf',
          ).catch(() => undefined);
          break;
        case NativeMessage.WEB_ERROR:
          console.warn(
            `[web error] ${msg.source ?? 'unknown'}${msg.where ? ` · ${msg.where}` : ''}: ${msg.message ?? ''}`,
            { route: msg.route, code: msg.code, stack: msg.stack },
          );
          break;
        case NativeMessage.HAPTIC: {
          if (msg.style === 'success') {
            haptics.success();
            break;
          }
          if (msg.style === 'warning') {
            haptics.warning();
            break;
          }
          const now = Date.now();
          if (now - lastTapHaptic.current < TAP_HAPTIC_GAP_MS) break;
          lastTapHaptic.current = now;
          if (msg.style === 'medium') haptics.press();
          else haptics.tap();
          break;
        }
        case NativeMessage.DICTATE:
          handleWebDictate(msg.action);
          break;
      }
    },
    [clearHealthCheck, dispatch, recoverWebSession, handleWebDictate],
  );

  // Keep external hosts (Stripe checkout/portal, etc.) out of the WebView — open
  // them in the system browser and reload on return. Same-origin + Supabase stay.
  const onShouldStartLoad = useCallback<ShouldStartLoad>(
    req => {
      if (req.isTopFrame === false) return true;
      const url = req.url;
      if (url.startsWith('blob:') || url.startsWith('data:')) return false;
      if (!url.startsWith('http')) return true;
      const host = hostOf(url);
      const appHost = hostOf(WEB_APP_URL);
      const isExternal =
        host !== appHost && !host.endsWith('supabase.co');
      if (isExternal) {
        openedExternal.current = true;
        Linking.openURL(url).catch(() => undefined);
        return false;
      }
      // Never let a full load of the web sign-in through — recover instead.
      if (isWebAuthRoute(url)) {
        recoverWebSession();
        return false;
      }
      return true;
    },
    [recoverWebSession],
  );

  // Client-side route changes skip `onShouldStartLoadWithRequest`, so the web's
  // own `<Navigate to="/login">` is caught here instead.
  const onNavStateChange = useCallback(
    (navState: WebViewNavigation) => {
      canGoBackRef.current = navState.canGoBack;
      if (navState.url.startsWith('http')) lastUrl.current = navState.url;
      if (isWebAuthRoute(navState.url)) recoverWebSession();
    },
    [recoverWebSession],
  );

  const onLoadError = useCallback((description?: string) => {
    setLoadError(description || 'The dashboard could not be loaded.');
    setReady(true);
  }, []);

  return (
    <View style={styles.flex}>
      {/* No native header: the web app renders its own. Back out via the web's
          SWITCH_VIEW message or Android hardware back. The inset strip is tinted
          to the web header's navy so the notch area doesn't read as a gap. */}
      <View
        style={[
          styles.flex,
          { paddingTop: insets.top, backgroundColor: colors.secondary },
        ]}
      >
        {configured && bootstrap ? (
          <TypedWebView
            // Remounts on a re-seed so the bootstrap script runs again with the
            // refreshed session instead of replaying the stale one on reload.
            key={seedKey}
            ref={webRef}
            source={{ uri: sourceUri }}
            originWhitelist={['*']}
            injectedJavaScriptBeforeContentLoaded={bootstrap}
            onMessage={onMessage}
            onContentProcessDidTerminate={onWebProcessGone}
            onRenderProcessGone={onWebProcessGone}
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onNavigationStateChange={onNavStateChange}
            onError={e => onLoadError(e.nativeEvent.description)}
            onHttpError={e =>
              onLoadError(`Server responded ${e.nativeEvent.statusCode}.`)
            }
            domStorageEnabled
            javaScriptEnabled
            allowsInlineMediaPlayback
            hideKeyboardAccessoryView
            pullToRefreshEnabled={false}
            bounces={false}
            overScrollMode="never"
            setSupportMultipleWindows={false}
            textZoom={100}
            style={styles.flex}
          />
        ) : null}

        {!configured || loadError ? (
          <View style={[styles.veil, { backgroundColor: colors.background }]}>
            <Ionicons
              name="cloud-offline-outline"
              size={44}
              color={colors.textMuted}
            />
            <Text style={styles.errorText}>
              {configured
                ? loadError
                : 'The employer dashboard address isn’t configured.'}
            </Text>
            {configured ? (
              <Pressable onPress={retry} style={styles.retryBtn} hitSlop={8}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {configured && !loadError && !ready ? (
        <View style={[styles.veil, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    veil: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    errorText: {
      paddingHorizontal: 40,
      textAlign: 'center',
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.text,
      lineHeight: 22,
    },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.primary,
    },
    retryText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onPrimary,
    },
  });

export default EmployerWebViewScreen;
