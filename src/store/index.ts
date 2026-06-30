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

const rootReducer = combineReducers({
  auth: authReducer,
  jobs: jobsReducer,
  pendingJobs: pendingJobsReducer,
  notifications: notificationsReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  // `jobs` is persisted so the list survives a cold start with no signal
  // (stale-while-revalidate: render the cache, then refetch when online).
  // `pendingJobs` holds jobs started offline until `job.start` syncs.
  whitelist: ['auth', 'jobs', 'pendingJobs'],
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
