import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

import { reportRequestOutcome } from '@/offline/connectivity';

const trackedFetch: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    reportRequestOutcome(true);
    return res;
  } catch (e) {
    reportRequestOutcome(false);
    throw e;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: trackedFetch },
});
