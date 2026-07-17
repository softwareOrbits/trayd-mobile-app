import { useEffect, useMemo, useState } from 'react';
import { LogBox, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';

import { persistor, store } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { restoreSession, logout } from '@/store/authSlice';
import { supabase } from '@/services/supabase';
import { clearMemberCache } from '@/services/member';
import {
  clearWebViewSession,
  pushSessionToWebView,
} from '@/webview/webviewRegistry';
import { ThemeProvider } from '@/theme';
import { LoadingScreen, OfflineBanner, SyncReminderBanner, toastConfig } from '@/components/ui';
import { SyncProvider, useOnline } from '@/offline';
import { CertComplianceProvider } from '@/compliance';
import { warmCaches } from '@/offline/prefetch';
import { fetchUnread, setUnread } from '@/store/notificationsSlice';
import { registerPush } from '@/services/push';
import AutoStopProvider from '@/components/shift/AutoStopProvider';
import AppNavigator from '@/navigation/AppNavigator';

LogBox.ignoreLogs(['Network request failed', 'TypeError: Network request failed']);

const SPLASH_DURATION = 1800;

function Bootstrap() {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch(restoreSession());
    const timer = setTimeout(() => setReady(true), SPLASH_DURATION);
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Wipe the employer WebView's session before it unmounts.
        clearWebViewSession();
        clearMemberCache();
        dispatch(logout());
        dispatch(setUnread(0));
      } else if (session && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
        // RN is the sole refresher; keep the open employer WebView in sync so its
        // (non-auto-refreshing) client never expires. No-op if it isn't mounted.
        pushSessionToWebView(session);
      }
    });
    return () => {
      clearTimeout(timer);
      authSub.subscription.unsubscribe();
    };
  }, [dispatch]);

  useEffect(() => {
    if (isLoggedIn) {
      warmCaches();
      registerPush();
      dispatch(fetchUnread());
    }
  }, [isLoggedIn, dispatch]);

  if (!ready) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <LoadingScreen />
      </>
    );
  }

  return (
    <PaperProvider>
      <BottomSheetModalProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" />
          <SyncProvider>
            <CertComplianceProvider>
              <AppShell />
            </CertComplianceProvider>
          </SyncProvider>
          <Toast topOffset={100} config={toastConfig} />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </PaperProvider>
  );
}

function AppShell() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const value = useMemo(
    () => (online ? insets : { ...insets, top: 0 }),
    [online, insets],
  );

  return (
    <>
      <OfflineBanner />
      <SyncReminderBanner />
      <SafeAreaInsetsContext.Provider value={value}>
        <AppNavigator />
      </SafeAreaInsetsContext.Provider>
      <AutoStopProvider />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <PersistGate
          loading={
            <ThemeProvider>
              <StatusBar barStyle="light-content" />
              <LoadingScreen />
            </ThemeProvider>
          }
          persistor={persistor}
        >
          <ThemeProvider>
            <Bootstrap />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
