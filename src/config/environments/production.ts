import type { EnvironmentConfig } from './types';

const production: EnvironmentConfig = {
  name: 'production',
  webUrl: 'https://app.trayd.ie',
  supabase: {
    url: 'https://cxhlmwqbvoozmnrtrkvo.supabase.co',
    anonKey: 'sb_publishable_A0j9dxpG2w0ZxnB4cYHwKw_zPGx7JVJ',
    projectRef: 'cxhlmwqbvoozmnrtrkvo',
  },
  googleMapsApiKey: 'AIzaSyCKhH5tUX55CGqYul0oq42eMFF_IrV-HOg',
  firebaseProjectId: 'trayd-prod',
};

export default production;
