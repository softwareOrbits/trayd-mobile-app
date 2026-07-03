import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { supabase } from '@/services/supabase';
import { clearMemberCache } from '@/services/member';
import { unregisterPush } from '@/services/push';
import { getJwtClaims } from '@/utils/jwt';
import type {
  AuthState,
  AuthUser,
  LoginRequest,
  SelectedView,
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
  isOwner: false,
  selectedView: null,
};

/** Read the `trayd_role.is_owner` claim (custom_access_token_hook) from a JWT. */
const readIsOwner = (accessToken: string): boolean => {
  const claims = getJwtClaims(accessToken);
  const role = claims?.trayd_role as { is_owner?: boolean } | undefined;
  return role?.is_owner === true;
};

/**
 * Initial view for a freshly-authenticated session. Owners start with no view
 * so the chooser is shown; everyone else goes straight to the field app,
 * exactly as before this feature existed.
 */
const initialViewFor = (isOwner: boolean): SelectedView | null =>
  isOwner ? null : 'field';

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
  const isOwner = readIsOwner(data.session.access_token);
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: data.user?.id, email: data.user?.email ?? undefined },
    isOwner,
    selectedView: initialViewFor(isOwner),
  };
});

export const restoreSession = createAsyncThunk<SetCredentialsPayload | null>(
  'auth/restoreSession',
  async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      return null;
    }
    const isOwner = readIsOwner(data.session.access_token);
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: data.session.user.id,
        email: data.session.user.email ?? undefined,
      },
      isOwner,
      // Cold start: recompute the initial view so owners always see the chooser.
      selectedView: initialViewFor(isOwner),
    };
  },
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await unregisterPush();
  await supabase.auth.signOut({ scope: 'local' });
  clearMemberCache();
});

const applyCredentials = (
  state: AuthState,
  payload: SetCredentialsPayload,
) => {
  state.accessToken = payload.accessToken;
  state.refreshToken = payload.refreshToken ?? state.refreshToken;
  state.user = payload.user ?? state.user;
  state.isLoggedIn = true;
  if (payload.isOwner !== undefined) state.isOwner = payload.isOwner;
  if (payload.selectedView !== undefined) state.selectedView = payload.selectedView;
};

const clearCredentials = (state: AuthState) => {
  state.accessToken = null;
  state.refreshToken = null;
  state.user = null;
  state.isLoggedIn = false;
  state.isOwner = false;
  state.selectedView = null;
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
    setSelectedView: (
      state,
      action: PayloadAction<SelectedView | null>,
    ) => {
      state.selectedView = action.payload;
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

export const { setCredentials, setUser, setSelectedView, logout } =
  authSlice.actions;
export default authSlice.reducer;
