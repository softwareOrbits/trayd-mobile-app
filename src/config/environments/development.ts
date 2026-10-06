import type { EnvironmentConfig } from './types';

const development: EnvironmentConfig = {
  name: 'development',
  webUrl: 'https://dev.trayd.ie',
  supabase: {
    url: 'https://qakeivarhuxzatpygiaa.supabase.co',
    anonKey: 'sb_publishable_OMerPr9hMFBuiyOq7Dhdgg_YQCJRyau',
    projectRef: 'qakeivarhuxzatpygiaa',
  },
  googleMapsApiKey: 'AIzaSyCKhH5tUX55CGqYul0oq42eMFF_IrV-HOg',
  firebaseProjectId: 'trayd-8ce90',
};

export default development;
