import { createApi } from '@reduxjs/toolkit/query/react';
import baseQuery from './baseApi';
import type {
  AuthResponse,
  LoginRequest,
  RedeemInviteRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
  SuccessResponse,
  VerifyOtpRequest,
} from '@/types';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  tagTypes: ['Auth'],
  endpoints: builder => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
    }),

    verifyOtp: builder.mutation<AuthResponse, VerifyOtpRequest>({
      query: body => ({ url: '/auth/verify-otp', method: 'POST', body }),
    }),

    requestPasswordReset: builder.mutation<
      SuccessResponse,
      RequestPasswordResetRequest
    >({
      query: body => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<SuccessResponse, ResetPasswordRequest>({
      query: body => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    redeemInvite: builder.mutation<AuthResponse, RedeemInviteRequest>({
      query: body => ({ url: '/auth/redeem-invite', method: 'POST', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useVerifyOtpMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useRedeemInviteMutation,
} = authApi;
