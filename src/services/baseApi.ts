import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '@env';
import { logout } from '@/store/authSlice';
import type { RootState } from '@/store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Accept', 'application/json');
    return headers;
  },
});

const showError = (status: number | string, data?: unknown) => {
  const message =
    typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message?: unknown }).message)
      : undefined;

  switch (status) {
    case 401:
      Toast.show({ type: 'error', text1: 'Session expired. Please log in again.' });
      break;
    case 404:
      Toast.show({ type: 'error', text1: 'Resource not found.' });
      break;
    case 500:
      Toast.show({ type: 'error', text1: 'Server error. Please try again later.' });
      break;
    case 'FETCH_ERROR':
      Toast.show({ type: 'error', text1: 'Network error. Check your connection.' });
      break;
    default:
      Toast.show({ type: 'error', text1: message ?? 'Something went wrong.' });
  }
};

export const baseQueryWithInterceptor: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    if (result.error.status === 401) {
      api.dispatch(logout());
    }
    showError(result.error.status, result.error.data);
  }

  return result;
};

export default baseQueryWithInterceptor;
