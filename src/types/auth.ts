export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
};

/** Which experience an owner is currently in. `null` = show the chooser. */
export type SelectedView = 'field' | 'employer';

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** Owner (primary/secondary) per the JWT `trayd_role.is_owner` claim. */
  isOwner: boolean;
  /**
   * Chosen view. Transient (never persisted) — reset on every login and cold
   * start so owners always land on the chooser. Non-owners are forced to
   * 'field' so they never see it and the app behaves exactly as before.
   */
  selectedView: SelectedView | null;
};

export type SetCredentialsPayload = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
  isOwner?: boolean;
  selectedView?: SelectedView | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};
