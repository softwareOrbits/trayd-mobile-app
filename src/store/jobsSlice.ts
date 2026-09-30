import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchMyJobs } from '@/services/jobs';
import {
  logout,
  setCredentials,
  signInWithPassword,
  signOut,
} from './authSlice';
import type { Job, JobStatus, JobsState } from '@/types';
import { PAGE_SIZE } from '@/utils/pagination';

export const fetchJobs = createAsyncThunk<Job[], void, { rejectValue: string }>(
  'jobs/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyJobs({ offset: 0, limit: PAGE_SIZE });
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Unable to load jobs',
      );
    }
  },
);

export const fetchMoreJobs = createAsyncThunk<
  Job[],
  void,
  { state: { jobs: JobsState }; rejectValue: string }
>(
  'jobs/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await fetchMyJobs({
        offset: getState().jobs.items.length,
        limit: PAGE_SIZE,
      });
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Unable to load jobs',
      );
    }
  },
  {
    condition: (_, { getState }) => {
      const { jobs } = getState();
      return jobs.hasMore && !jobs.loadingMore && jobs.status === 'succeeded';
    },
  },
);

const initialState: JobsState = {
  items: [],
  status: 'idle',
  error: null,
  hasMore: true,
  loadingMore: false,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    patchJobStatus(
      state,
      action: PayloadAction<{ id: string; status: JobStatus }>,
    ) {
      const job = state.items.find(j => j.id === action.payload.id);
      if (job) job.status = action.payload.status;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchJobs.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.hasMore = action.payload.length === PAGE_SIZE;
      })
      .addCase(fetchMoreJobs.pending, state => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreJobs.fulfilled, (state, action) => {
        state.loadingMore = false;
        const seen = new Set(state.items.map(j => j.id));
        state.items.push(...action.payload.filter(j => !seen.has(j.id)));
        state.hasMore = action.payload.length === PAGE_SIZE;
      })
      .addCase(fetchMoreJobs.rejected, state => {
        state.loadingMore = false;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unable to load jobs';
      })
      // Clear cached jobs whenever the signed-in user changes, so the previous
      // user's jobs don't flash before the new user's fetch resolves.
      .addCase(signOut.fulfilled, () => initialState)
      .addCase(logout, () => initialState)
      .addCase(signInWithPassword.fulfilled, () => initialState)
      .addCase(setCredentials, () => initialState);
  },
});

export const { patchJobStatus } = jobsSlice.actions;
export default jobsSlice.reducer;
