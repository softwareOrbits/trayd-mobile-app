import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import { getJwtClaims } from '@/utils/jwt';
import type {
  AuthState,
  AuthUser,
  LoginRequest,
  SetCredentialsPayload,
} from '@/types';

// Reject reason used when a member can sign in but no longer belongs to an
// active business (removed/suspended) — the custom access-token hook leaves
// `business_id` null in that case.
export const ACCOUNT_SUSPENDED = 'account_suspended';

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
  // A removed/suspended member authenticates fine but has no `business_id`
  // claim (custom_access_token_hook skips removed rows) — block entry.
  const claims = getJwtClaims(data.session.access_token);
  if (!claims?.business_id) {
    await supabase.auth.signOut();
    return rejectWithValue(ACCOUNT_SUSPENDED);
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
