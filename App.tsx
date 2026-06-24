import { useEffect, useState } from 'react';
import { LogBox, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';

import { persistor, store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { restoreSession, logout } from '@/store/authSlice';
import { supabase } from '@/services/supabase';
import { clearMemberCache } from '@/services/member';
import { ThemeProvider } from '@/theme';
import { LoadingScreen, OfflineBanner } from '@/components/ui';
import { SyncProvider } from '@/offline';
import AppNavigator from '@/navigation/AppNavigator';

LogBox.ignoreLogs(['Network request failed', 'TypeError: Network request failed']);

const SPLASH_DURATION = 1800;

function Bootstrap() {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch(restoreSession());
    const timer = setTimeout(() => setReady(true), SPLASH_DURATION);
    const { data: authSub } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        clearMemberCache();
        dispatch(logout());
      }
    });
    return () => {
      clearTimeout(timer);
      authSub.subscription.unsubscribe();
    };
  }, [dispatch]);

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
            <OfflineBanner />
            <AppNavigator />
          </SyncProvider>
          <Toast topOffset={100} />
        </SafeAreaProvider>
      </BottomSheetModalProvider>
    </PaperProvider>
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
