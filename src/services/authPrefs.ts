import AsyncStorage from '@react-native-async-storage/async-storage';

const KEEP_SIGNED_IN_KEY = 'auth:keepsignedin:v1';

export async function setKeepSignedIn(keep: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEEP_SIGNED_IN_KEY, keep ? '1' : '0');
  } catch {
    return;
  }
}

export async function getKeepSignedIn(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEEP_SIGNED_IN_KEY);
    return raw !== '0';
  } catch {
    return true;
  }
}
