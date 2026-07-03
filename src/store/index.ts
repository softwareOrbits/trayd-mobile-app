import { combineReducers, configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  persistReducer,
  persistStore,
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import authReducer from './authSlice';
import jobsReducer from './jobsSlice';
import pendingJobsReducer from './pendingJobsSlice';
import notificationsReducer from './notificationsSlice';

// Nested persist for auth so `selectedView` is NEVER persisted — it's recomputed
// on every login / cold start (see authSlice) so owners always land on the
// chooser and pick their view fresh each time they open the app.
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  blacklist: ['selectedView'],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  jobs: jobsReducer,
  pendingJobs: pendingJobsReducer,
  notifications: notificationsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // `auth` is persisted via its own nested config above.
  // `jobs` is persisted so the list survives a cold start with no signal
  // (stale-while-revalidate: render the cache, then refetch when online).
  // `pendingJobs` holds jobs started offline until `job.start` syncs.
  whitelist: ['jobs', 'pendingJobs'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
