import { useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { persistor, store } from '@/store';
import { useAppDispatch } from '@/store/hooks';
import { restoreSession } from '@/store/authSlice';
import { ThemeProvider } from '@/theme';
import { LoadingScreen } from '@/components/ui';
import AppNavigator from '@/navigation/AppNavigator';

const SPLASH_DURATION = 1800;

function Bootstrap() {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch(restoreSession());
    const timer = setTimeout(() => setReady(true), SPLASH_DURATION);
    return () => clearTimeout(timer);
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
    <BottomSheetModalProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AppNavigator />
        <Toast topOffset={100} />
      </SafeAreaProvider>
    </BottomSheetModalProvider>
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
