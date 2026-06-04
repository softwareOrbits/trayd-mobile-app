export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  photo?: string;
};

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoggedIn: boolean;
};

export type SetCredentialsPayload = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
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
