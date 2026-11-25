export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
};

/** Which experience the user is currently in. `null` = show the chooser. */
export type SelectedView = 'field' | 'employer';

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
  /** Owner (primary/secondary) per the JWT `trayd_role.is_owner` claim. */
  isOwner: boolean;
  employerView: boolean;
  employeeView: boolean;
  /**
   * Chosen view. Transient (never persisted) — reset on every login and cold
   * start so anyone with both views lands on the chooser.
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
