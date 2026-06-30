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

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { JobTabKey } from './jobs';

export type MainTabParamList = {
  Jobs: { initialTab?: JobTabKey } | undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  JobDetail: { jobId: string };
  JobChat: { jobId: string };
  StartJob: undefined;
  AddNote: { jobId: string };
  AddReceipt: { jobId: string };
  AddJobPhoto: { jobId: string; photoCount: number };
  WrapUpJob: { jobId: string };
  EditJob: { jobId: string };
  ChangePassword: undefined;
  WorkingHours: undefined;
  ServiceArea: undefined;
};
