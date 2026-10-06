import { config } from './environments';

export {
  APP_ENV_EXPLICIT,
  ENVIRONMENT,
  ENVIRONMENTS,
  IS_PRODUCTION,
  config,
} from './environments';
export type { AppEnvironment, EnvironmentConfig } from './environments';

const trimSlash = (url: string) => url.trim().replace(/\/+$/, '');

export const WEB_APP_URL = trimSlash(config.webUrl);

export const SUPABASE_URL = config.supabase.url;

export const SUPABASE_ANON_KEY = config.supabase.anonKey;

export const GOOGLE_MAPS_API_KEY = config.googleMapsApiKey;

export const webUrl = (path = ''): string =>
  path ? `${WEB_APP_URL}/${path.replace(/^\/+/, '')}` : WEB_APP_URL;

export const SIGNUP_URL = webUrl('signup?from=app');

export const WEB_LOGIN_URL = webUrl('login');
