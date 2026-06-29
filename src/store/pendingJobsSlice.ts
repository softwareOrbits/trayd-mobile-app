import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  logout,
  setCredentials,
  signInWithPassword,
  signOut,
} from './authSlice';
import type { Job, JobStatus } from '@/types';

type PendingJobsState = { items: Job[] };

const initialState: PendingJobsState = { items: [] };

const pendingJobsSlice = createSlice({
  name: 'pendingJobs',
  initialState,
  reducers: {
    addPendingJob(state, action: PayloadAction<Job>) {
      if (!state.items.some(j => j.id === action.payload.id)) {
        state.items.unshift(action.payload);
      }
    },
    removePendingJob(state, action: PayloadAction<string>) {
      state.items = state.items.filter(j => j.id !== action.payload);
    },
    setPendingJobStatus(
      state,
      action: PayloadAction<{ id: string; status: JobStatus }>,
    ) {
      const job = state.items.find(j => j.id === action.payload.id);
      if (job) job.status = action.payload.status;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(signOut.fulfilled, () => initialState)
      .addCase(logout, () => initialState)
      .addCase(signInWithPassword.fulfilled, () => initialState)
      .addCase(setCredentials, () => initialState);
  },
});

export const { addPendingJob, removePendingJob, setPendingJobStatus } =
  pendingJobsSlice.actions;
export default pendingJobsSlice.reducer;
