import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchMyJobs } from '@/services/jobs';
import {
  logout,
  setCredentials,
  signInWithPassword,
  signOut,
} from './authSlice';
import type { Job, JobStatus, JobsState } from '@/types';

export const fetchJobs = createAsyncThunk<Job[], void, { rejectValue: string }>(
  'jobs/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyJobs();
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : 'Unable to load jobs',
      );
    }
  },
);

const initialState: JobsState = {
  items: [],
  status: 'idle',
  error: null,
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
