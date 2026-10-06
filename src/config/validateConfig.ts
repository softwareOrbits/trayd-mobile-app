import { getApp } from '@react-native-firebase/app';

import { APP_ENV_EXPLICIT, ENVIRONMENT, WEB_APP_URL, config } from './environment';

export type ConfigProblem = {
  level: 'error' | 'warning';
  area: 'environment' | 'supabase' | 'firebase' | 'web';
  message: string;
};

export type ConfigReport = {
  environment: string;
  webUrl: string;
  supabaseRef: string | null;
  firebaseProject: string | null;
  problems: ConfigProblem[];
  ok: boolean;
};

const CONFIG_FILE = `src/config/environments/${ENVIRONMENT}.ts`;

const supabaseRefOf = (url: string): string | null => {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(url.trim());
  return match ? match[1].toLowerCase() : null;
};

const firebaseProjectId = (): { id: string | null; error: string | null } => {
  try {
    return { id: getApp().options.projectId ?? null, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : String(e) };
  }
};

export function validateConfig(): ConfigReport {
  const problems: ConfigProblem[] = [];
  const url = config.supabase.url.trim();
  const key = config.supabase.anonKey.trim();

  if (!APP_ENV_EXPLICIT) {
    problems.push({
      level: 'warning',
      area: 'environment',
      message: `APP_ENV is not set, so the app fell back to "${ENVIRONMENT}". Start Metro / build with the npm scripts (npm start, npm run start:prod, …) so APP_ENV is set.`,
    });
  }

  if (!url) {
    problems.push({ level: 'error', area: 'supabase', message: `supabase.url is empty in ${CONFIG_FILE}.` });
  }
  if (!key) {
    problems.push({ level: 'error', area: 'supabase', message: `supabase.anonKey is empty in ${CONFIG_FILE}.` });
  }

  const supabaseRef = url ? supabaseRefOf(url) : null;
  if (url && !supabaseRef) {
    problems.push({
      level: 'error',
      area: 'supabase',
      message: `supabase.url "${url}" in ${CONFIG_FILE} is not a valid https://<project>.supabase.co address.`,
    });
  } else if (supabaseRef && supabaseRef !== config.supabase.projectRef) {
    problems.push({
      level: 'warning',
      area: 'supabase',
      message: `supabase.url points at "${supabaseRef}" but supabase.projectRef says "${config.supabase.projectRef}" in ${CONFIG_FILE}.`,
    });
  }

  const firebase = firebaseProjectId();
  if (firebase.error) {
    problems.push({
      level: 'warning',
      area: 'firebase',
      message: `Firebase is not configured, so push notifications are off: ${firebase.error}. Check the google-services.json / GoogleService-Info.plist for ${ENVIRONMENT}.`,
    });
  } else if (firebase.id && firebase.id !== config.firebaseProjectId) {
    problems.push({
      level: 'warning',
      area: 'firebase',
      message: `This ${ENVIRONMENT} JS bundle runs on a native build using Firebase project "${firebase.id}", expected "${config.firebaseProjectId}". Metro and the installed build use different environments — run the matching npm scripts (e.g. start:prod with android:prod).`,
    });
  }

  if (!/^https?:\/\//.test(WEB_APP_URL)) {
    problems.push({
      level: 'error',
      area: 'web',
      message: `webUrl "${WEB_APP_URL}" in ${CONFIG_FILE} is not a valid URL.`,
    });
  }

  return {
    environment: ENVIRONMENT,
    webUrl: WEB_APP_URL,
    supabaseRef,
    firebaseProject: firebase.id,
    problems,
    ok: !problems.some(p => p.level === 'error'),
  };
}

export function logConfigReport(report: ConfigReport): void {
  console.log(
    `[env] ${report.environment} · web ${report.webUrl} · supabase ${report.supabaseRef ?? '—'} · firebase ${report.firebaseProject ?? '—'}`,
  );
  for (const p of report.problems) {
    const line = `[env:${p.area}] ${p.message}`;
    if (p.level === 'error') console.error(line);
    else console.warn(line);
  }
}
