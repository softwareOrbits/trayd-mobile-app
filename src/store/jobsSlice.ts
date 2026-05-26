import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import { demoJobs } from '@/data/demoJobs';
import type { Job, JobUpdate, JobsState, NewJob } from '@/types';

const TABLE = 'jobs';

type JobRow = {
  id: string;
  client: string;
  region: string;
  postcode: string;
  service: string;
  status: Job['status'];
  time: string;
  scheduled_date: string;
  co_assigned_by: string | null;
  review: Job['review'] | null;
};

const mapRow = (row: JobRow): Job => ({
  id: row.id,
  client: row.client,
  region: row.region,
  postcode: row.postcode,
  service: row.service,
  status: row.status,
  time: row.time,
  scheduledDate: row.scheduled_date,
  coAssignedBy: row.co_assigned_by ?? undefined,
  review: row.review ?? undefined,
});

const toRow = (job: JobUpdate) => {
  const row: Record<string, unknown> = {};
  if (job.client !== undefined) row.client = job.client;
  if (job.region !== undefined) row.region = job.region;
  if (job.postcode !== undefined) row.postcode = job.postcode;
  if (job.service !== undefined) row.service = job.service;
  if (job.status !== undefined) row.status = job.status;
  if (job.time !== undefined) row.time = job.time;
  if (job.scheduledDate !== undefined) row.scheduled_date = job.scheduledDate;
  if (job.coAssignedBy !== undefined) row.co_assigned_by = job.coAssignedBy ?? null;
  if (job.review !== undefined) row.review = job.review ?? null;
  return row;
};

export const fetchJobs = createAsyncThunk<Job[], void, { rejectValue: string }>(
  'jobs/fetch',
  async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('time', { ascending: true });
    if (error) {
      return demoJobs;
    }
    const rows = ((data ?? []) as JobRow[]).map(mapRow);
    return rows.length > 0 ? rows : demoJobs;
  },
);

export const createJob = createAsyncThunk<Job, NewJob, { rejectValue: string }>(
  'jobs/create',
  async (job, { rejectWithValue }) => {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(toRow(job))
      .select()
      .single();
    if (error || !data) {
      return rejectWithValue(error?.message ?? 'Unable to create job');
    }
    return mapRow(data as JobRow);
  },
);

export const updateJob = createAsyncThunk<
  Job,
  { id: string; changes: JobUpdate },
  { rejectValue: string }
>('jobs/update', async ({ id, changes }, { rejectWithValue }) => {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(changes))
    .eq('id', id)
    .select()
    .single();
  if (error || !data) {
    return rejectWithValue(error?.message ?? 'Unable to update job');
  }
  return mapRow(data as JobRow);
});

export const deleteJob = createAsyncThunk<string, string, { rejectValue: string }>(
  'jobs/delete',
  async (id, { rejectWithValue }) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) {
      return rejectWithValue(error.message);
    }
    return id;
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
  reducers: {},
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
      .addCase(createJob.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        const index = state.items.findIndex(job => job.id === action.payload.id);
        if (index >= 0) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.items = state.items.filter(job => job.id !== action.payload);
      });
  },
});

export default jobsSlice.reducer;
