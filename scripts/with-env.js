const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FLAVORS = { development: 'dev', production: 'prod' };

const root = path.resolve(__dirname, '..');
const [, , envArg, ...command] = process.argv;
const env = { dev: 'development', prod: 'production' }[envArg] ?? envArg;

if (!FLAVORS[env] || command.length === 0) {
  console.error('Usage: node scripts/with-env.js <development|production> <command...>');
  process.exit(1);
}

const flavor = FLAVORS[env];
const errors = [];
const warnings = [];

const configRel = `src/config/environments/${env}.ts`;
const configPath = path.join(root, configRel);

const readConfig = () => {
  const source = fs.readFileSync(configPath, 'utf8');
  const field = name => new RegExp(`${name}:\\s*'([^']*)'`).exec(source)?.[1] ?? '';
  return {
    webUrl: field('webUrl'),
    supabaseUrl: field('url'),
    anonKey: field('anonKey'),
    projectRef: field('projectRef'),
    mapsKey: field('googleMapsApiKey'),
    firebaseProjectId: field('firebaseProjectId'),
  };
};

let config = null;
if (!fs.existsSync(configPath)) {
  errors.push(`${configRel} is missing.`);
} else {
  config = readConfig();
  if (!config.webUrl) errors.push(`${configRel}: webUrl is empty.`);
  if (!config.supabaseUrl) errors.push(`${configRel}: supabase.url is empty.`);
  if (!config.anonKey) errors.push(`${configRel}: supabase.anonKey is empty.`);
  if (!config.firebaseProjectId) errors.push(`${configRel}: firebaseProjectId is empty.`);
  const ref = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(config.supabaseUrl)?.[1];
  if (config.supabaseUrl && !ref) {
    errors.push(`${configRel}: supabase.url "${config.supabaseUrl}" is not a https://<project>.supabase.co address.`);
  } else if (ref && config.projectRef && ref !== config.projectRef) {
    warnings.push(`${configRel}: supabase.url points at "${ref}" but supabase.projectRef is "${config.projectRef}".`);
  }
  if (!config.mapsKey) {
    warnings.push(`${configRel}: googleMapsApiKey is empty — maps and address search won't work.`);
  }
}

const expectedFirebase = config?.firebaseProjectId;

const androidFirebase = path.join(root, 'android', 'app', 'src', flavor, 'google-services.json');
if (!fs.existsSync(androidFirebase)) {
  errors.push(`android/app/src/${flavor}/google-services.json is missing (Firebase ${expectedFirebase}).`);
} else {
  try {
    const project = JSON.parse(fs.readFileSync(androidFirebase, 'utf8')).project_info?.project_id;
    if (expectedFirebase && project !== expectedFirebase) {
      errors.push(`android/app/src/${flavor}/google-services.json is for Firebase "${project}", but ${configRel} expects "${expectedFirebase}".`);
    }
  } catch (e) {
    errors.push(`android/app/src/${flavor}/google-services.json is not valid JSON: ${e.message}`);
  }
}

const iosFirebase = path.join(root, 'ios', 'Firebase', env, 'GoogleService-Info.plist');
if (!fs.existsSync(iosFirebase)) {
  (command.some(c => /ios/.test(c)) ? errors : warnings).push(
    `ios/Firebase/${env}/GoogleService-Info.plist is missing (Firebase ${expectedFirebase}).`,
  );
} else {
  const plist = fs.readFileSync(iosFirebase, 'utf8');
  const project = /<key>PROJECT_ID<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
  if (expectedFirebase && project !== expectedFirebase) {
    warnings.push(`ios/Firebase/${env}/GoogleService-Info.plist is for Firebase "${project}", but ${configRel} expects "${expectedFirebase}".`);
  }
}

const devFirebase = path.join(root, 'android', 'app', 'src', 'dev', 'google-services.json');
const devHasOwnAppId =
  fs.existsSync(devFirebase) &&
  fs.readFileSync(devFirebase, 'utf8').includes('"com.trayd.app.dev"');

for (const w of warnings) console.warn(`[env] warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[env] error: ${e}`);
  console.error(`[env] Not starting — fix the ${errors.length} error(s) above for APP_ENV=${env}.`);
  process.exit(1);
}

const args = [...command];
if (env === 'development' && devHasOwnAppId && args.includes('run-android')) {
  args.push('--appIdSuffix', 'dev');
}

console.log(
  `[env] APP_ENV=${env} · ${config.webUrl} · Supabase ${config.projectRef} · Firebase ${expectedFirebase} · Android flavor ${flavor}`,
);

const result = spawnSync(args[0], args.slice(1), {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, APP_ENV: env },
});
if (result.error) {
  console.error(`[env] Could not run "${args.join(' ')}": ${result.error.message}`);
}
process.exit(result.status ?? 1);
