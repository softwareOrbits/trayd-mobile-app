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
  Image,
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
import { BASE_URL } from '@env';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppDispatch } from '@/store/hooks';
import { setSelectedView, signOut } from '@/store/authSlice';
import type { MainStackParamList } from '@/types';
import { supabase } from '@/services/supabase';
import { savePdfAndShare } from '@/services/pdf';
import {
  buildBootstrapScript,
  NativeMessage,
  type NativeInboundMessage,
} from '@/webview/session-bridge';
import {
  pushSessionToWebView,
  registerEmployerWebView,
  reloadWebView,
  unregisterEmployerWebView,
} from '@/webview/webviewRegistry';
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

/** Host of a URL without pulling in a URL polyfill: `https://a.b/c` → `a.b`. */
const hostOf = (url: string): string => url.split('/')[2] ?? '';

const EmployerWebViewScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const openedExternal = useRef(false);

  const [bootstrap, setBootstrap] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const configured = !!BASE_URL;

  const retry = useCallback(() => {
    setLoadError(null);
    setReady(false);
    webRef.current?.reload();
  }, []);

  // Seed the injected script from the freshest session before the WebView loads.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setBootstrap(buildBootstrapScript(data.session));
      else dispatch(signOut());
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Expose this WebView to code outside the tree (token-refresh push, teardown).
  useEffect(() => {
    const controls = {
      injectJavaScript: (script: string) => webRef.current?.injectJavaScript(script),
      reload: () => webRef.current?.reload(),
    };
    registerEmployerWebView(controls);
    return () => unregisterEmployerWebView(controls);
  }, []);

  // Fallback: never leave the veil up forever if the web never posts READY.
  useEffect(() => {
    if (ready || !bootstrap) return;
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, [ready, bootstrap]);

  // On foreground: refresh the web session and reload if we came back from an
  // external (Stripe) hop so the dashboard reflects the new state.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) pushSessionToWebView(data.session);
      });
      if (openedExternal.current) {
        openedExternal.current = false;
        reloadWebView();
      }
    });
    return () => sub.remove();
  }, []);

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
      dispatch(setSelectedView(null));
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [dispatch, navigation]);

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
          setReady(true);
          break;
        case NativeMessage.SIGNED_OUT:
          // Cover the WebView so a web-side /login redirect isn't visible while
          // the native app tears the screen down.
          setReady(false);
          dispatch(signOut());
          break;
        case NativeMessage.SWITCH_VIEW:
          dispatch(setSelectedView(null));
          break;
        case NativeMessage.SAVE_PDF:
          savePdfAndShare(msg.filename, msg.base64).catch(() => undefined);
          break;
      }
    },
    [dispatch],
  );

  // Keep external hosts (Stripe checkout/portal, etc.) out of the WebView — open
  // them in the system browser and reload on return. Same-origin + Supabase stay.
  const onShouldStartLoad = useCallback<ShouldStartLoad>(req => {
    if (req.isTopFrame === false) return true;
    const url = req.url;
    if (!url.startsWith('http')) return true;
    const host = hostOf(url);
    const appHost = hostOf(BASE_URL);
    const isExternal =
      host !== appHost && !host.endsWith('supabase.co');
    if (isExternal) {
      openedExternal.current = true;
      Linking.openURL(url).catch(() => undefined);
      return false;
    }
    return true;
  }, []);

  const onNavStateChange = useCallback((navState: WebViewNavigation) => {
    canGoBackRef.current = navState.canGoBack;
  }, []);

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
            ref={webRef}
            source={{ uri: BASE_URL }}
            originWhitelist={['*']}
            injectedJavaScriptBeforeContentLoaded={bootstrap}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onNavigationStateChange={onNavStateChange}
            onError={e => onLoadError(e.nativeEvent.description)}
            onHttpError={e =>
              onLoadError(`Server responded ${e.nativeEvent.statusCode}.`)
            }
            domStorageEnabled
            javaScriptEnabled
            allowsInlineMediaPlayback
            pullToRefreshEnabled={false}
            bounces={false}
            overScrollMode="never"
            setSupportMultipleWindows={false}
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
                : 'The employer dashboard address (BASE_URL) isn’t configured.'}
            </Text>
            {configured ? (
              <Pressable onPress={retry} style={styles.retryBtn} hitSlop={8}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        ) : !ready ? (
          <View style={[styles.veil, { backgroundColor: colors.background }]}>
            <Image
              source={require('@assets/images/small_logo.png')}
              style={styles.veilLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </View>
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
    veilLogo: { width: 96, height: 70 },
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
