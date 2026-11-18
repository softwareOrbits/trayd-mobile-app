import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

export type SpeechErrorCode =
  | 'not-allowed'
  | 'network'
  | 'audio-capture'
  | 'busy'
  | 'language-not-supported'
  | 'service-not-allowed'
  | 'unknown';

export type SpeechEvent =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'result'; transcript: string; isFinal: boolean; cumulative?: boolean }
  | { type: 'error'; error: SpeechErrorCode };

type NativeSpeech = {
  isAvailable: () => Promise<boolean>;
  requestPermission?: () => Promise<boolean>;
  start: (lang: string) => void;
  stop: () => void;
  abort: () => void;
};

const native: NativeSpeech | undefined = NativeModules.TraydSpeech;
const emitter = native ? new NativeEventEmitter(NativeModules.TraydSpeech) : null;

export type MicPermission = 'granted' | 'denied' | 'blocked';

export const speech = {
  supported: !!native,

  isAvailable: async (): Promise<boolean> => {
    if (!native) return false;
    try {
      return await native.isAvailable();
    } catch {
      return false;
    }
  },

  requestPermission: async (): Promise<MicPermission> => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
      return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
        ? 'blocked'
        : 'denied';
    }
    const granted = (await native?.requestPermission?.()) ?? false;
    return granted ? 'granted' : 'blocked';
  },

  start: (lang: string) => native?.start(lang),
  stop: () => native?.stop(),
  abort: () => native?.abort(),

  subscribe: (listener: (event: SpeechEvent) => void) => {
    const sub = emitter?.addListener('TraydSpeechEvent', listener);
    return () => sub?.remove();
  },
};
