import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import type {
  AuthState,
  AuthUser,
  LoginRequest,
  SetCredentialsPayload,
} from '@/types';

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,
};

export const signInWithPassword = createAsyncThunk<
  SetCredentialsPayload,
  LoginRequest,
  { rejectValue: string }
>('auth/signInWithPassword', async ({ email, password }, { rejectWithValue }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    return rejectWithValue(error?.message ?? 'Unable to sign in');
  }
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: data.user?.id, email: data.user?.email ?? undefined },
  };
});

export const restoreSession = createAsyncThunk<SetCredentialsPayload | null>(
  'auth/restoreSession',
  async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return null;
    }
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.session.user.id,
        email: data.session.user.email ?? undefined,
      },
    };
  },
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await supabase.auth.signOut();
});

const applyCredentials = (
  state: AuthState,
  payload: SetCredentialsPayload,
) => {
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken ?? state.refreshToken;
  state.user = payload.user ?? state.user;
  state.isLoggedIn = true;
};

const clearCredentials = (state: AuthState) => {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  state.isLoggedIn = false;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      applyCredentials(state, action.payload);
    },
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    logout: clearCredentials,
  },
  extraReducers: builder => {
    builder
      .addCase(signInWithPassword.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        if (action.payload) {
          applyCredentials(state, action.payload);
        }
      })
      .addCase(signOut.fulfilled, clearCredentials);
  },
});

export const { setCredentials, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
