export type AuthStackParamList = {
  Login: undefined;
  ResetPassword: undefined;
  VerifyIdentity: { email: string };
  CreatePassword: { email: string; token?: string; mode?: 'reset' | 'onboard' };
  InviteCode: undefined;
  ConfirmInvite: undefined;
  OnboardNotifications: undefined;
  OnboardLocation: undefined;
  OnboardPhoto: undefined;
  OnboardDone: undefined;
};

export type MainTabParamList = {
  Jobs: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  JobChat: { jobId: string };
};
