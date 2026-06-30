import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { listNotifications } from '@/services/notifications';

type NotificationsState = { unread: number };

const initialState: NotificationsState = { unread: 0 };

export const fetchUnread = createAsyncThunk(
  'notifications/fetchUnread',
  async () => {
    const { unread } = await listNotifications();
    return unread;
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnread(state, action: PayloadAction<number>) {
      state.unread = Math.max(0, action.payload);
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchUnread.fulfilled, (state, action) => {
      state.unread = action.payload;
    });
  },
});

export const { setUnread } = notificationsSlice.actions;
export default notificationsSlice.reducer;
