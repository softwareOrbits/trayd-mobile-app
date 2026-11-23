import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENVIRONMENT, config } from '@/config/environment';

// Dev and production builds share a bundle id, so installing one over the
// other keeps the phone's AsyncStorage. The old build's saved login, cached
// jobs and offline queue belong to a different Supabase project and break the
// new build (TRA-55: blank screen). This key records which backend the stored
// data belongs to.
const ENV_KEY = 'app:environment:v1';

const currentStamp = () => `${ENVIRONMENT}:${config.supabase.projectRef}`;

/**
 * Wipes everything stored on the phone when it was written by a build that
 * talks to a different backend. Returns true if data was wiped, so the caller
 * can reset in-memory state and send the user to the login screen.
 *
 * Builds from before this guard never wrote the stamp, so a Supabase session
 * key for another project (`sb-<otherRef>-auth-token`) also counts as a switch.
 */
export async function clearDataFromOtherEnvironment(): Promise<boolean> {
  try {
    const stamp = currentStamp();
    const ownSessionPrefix = `sb-${config.supabase.projectRef}-`;
    const [stored, keys] = await Promise.all([
      AsyncStorage.getItem(ENV_KEY),
      AsyncStorage.getAllKeys(),
    ]);
    const otherProjectSession = keys.some(
      key => key.startsWith('sb-') && !key.startsWith(ownSessionPrefix),
    );
    const switched = (stored !== null && stored !== stamp) || otherProjectSession;
    if (switched) {
      await AsyncStorage.removeMany(keys.filter(key => key !== ENV_KEY));
    }
    if (stored !== stamp) await AsyncStorage.setItem(ENV_KEY, stamp);
    return switched;
  } catch {
    return false;
  }
}
