import { APP_ENV } from '@env';

import development from './development';
import production from './production';
import type { AppEnvironment, EnvironmentConfig } from './types';

export type { AppEnvironment, EnvironmentConfig } from './types';

export const ENVIRONMENTS: Record<AppEnvironment, EnvironmentConfig> = {
  development,
  production,
};

const resolveEnvironment = (): { name: AppEnvironment; explicit: boolean } => {
  const value = (APP_ENV ?? '').trim().toLowerCase();
  if (value === 'production' || value === 'prod') return { name: 'production', explicit: true };
  if (value === 'development' || value === 'dev') return { name: 'development', explicit: true };
  return { name: __DEV__ ? 'development' : 'production', explicit: false };
};

const resolved = resolveEnvironment();

export const ENVIRONMENT: AppEnvironment = resolved.name;

export const APP_ENV_EXPLICIT = resolved.explicit;

export const config: EnvironmentConfig = ENVIRONMENTS[ENVIRONMENT];

export const IS_PRODUCTION = ENVIRONMENT === 'production';
