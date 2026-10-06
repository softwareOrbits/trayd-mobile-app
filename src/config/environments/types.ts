export type AppEnvironment = 'development' | 'production';

export type EnvironmentConfig = {
  name: AppEnvironment;
  webUrl: string;
  supabase: {
    url: string;
    anonKey: string;
    projectRef: string;
  };
  googleMapsApiKey: string;
  firebaseProjectId: string;
};
