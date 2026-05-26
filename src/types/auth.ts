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

export type VerifyOtpRequest = {
  email: string;
  code: string;
};

export type RequestPasswordResetRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type RedeemInviteRequest = {
  inviteCode: string;
  password: string;
};

export type SuccessResponse = {
  success: boolean;
};
