import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tracks who has already been walked through the permission priming screens.
 * Keyed per user so a second account on a shared phone still gets the
 * explanation, and so signing out doesn't re-run it for the same person.
 */
const keyFor = (userId: string) => `permissionPriming:v1:${userId}`;

export async function hasPrimedPermissions(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) === 'done';
  } catch {
    // A storage failure must not trap the user on the priming screens.
    return true;
  }
}

export async function markPermissionsPrimed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), 'done');
  } catch {
    // Non-fatal: worst case the flow shows once more next launch.
  }
}
