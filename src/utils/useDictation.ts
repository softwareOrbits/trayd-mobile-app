import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { speech, type SpeechErrorCode, type SpeechEvent } from '@/services/speech';
import { haptics } from '@/utils/haptics';
import { openPermissionSettings } from '@/utils/permissions';

const PRIMARY_LANG = 'en-IE';
const FALLBACK_LANG = 'en-GB';

const ERROR_MESSAGES: Partial<Record<SpeechErrorCode, string>> = {
  'service-not-allowed': "Dictation isn't available on this phone.",
  'language-not-supported': "Dictation isn't available in English on this phone.",
  network: 'Dictation needs signal. Try again or type it instead.',
  'audio-capture': 'Could not use the microphone.',
  busy: 'The microphone is busy. Try again in a moment.',
};

const joinWords = (...parts: string[]) =>
  parts
    .map(p => p.trim())
    .filter(Boolean)
    .join(' ');

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const appendSpoken = (base: string, spoken: string) => {
  if (!spoken) return base;
  if (!base.trim()) return capitalise(spoken);
  const separator = /\s$/.test(base) ? '' : ' ';
  const startsSentence = /[.!?]\s*$/.test(base) || /\n\s*$/.test(base);
  return `${base}${separator}${startsSentence ? capitalise(spoken) : spoken}`;
};

const promptMicSettings = () =>
  Alert.alert(
    'Microphone access is off',
    'Turn on the microphone for Trayd in Settings to use dictation.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: openPermissionSettings },
    ],
  );

export function useDictation(value: string, onChange: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const active = useRef(false);
  const base = useRef('');
  const committed = useRef('');
  const interim = useRef('');
  const lang = useRef(PRIMARY_LANG);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const render = () =>
      onChangeRef.current(
        appendSpoken(base.current, joinWords(committed.current, interim.current)),
      );

    const handle = (event: SpeechEvent) => {
      if (!active.current) return;
      switch (event.type) {
        case 'start':
          setStarting(false);
          setListening(true);
          return;
        case 'result':
          if (event.isFinal) {
            committed.current = joinWords(
              committed.current,
              event.transcript.trim() ? event.transcript : interim.current,
            );
            interim.current = '';
          } else {
            interim.current = event.transcript;
          }
          render();
          return;
        case 'end':
          committed.current = joinWords(committed.current, interim.current);
          interim.current = '';
          render();
          active.current = false;
          setStarting(false);
          setListening(false);
          return;
        case 'error':
          if (event.error === 'language-not-supported' && lang.current !== FALLBACK_LANG) {
            lang.current = FALLBACK_LANG;
            speech.start(FALLBACK_LANG);
            return;
          }
          active.current = false;
          setStarting(false);
          setListening(false);
          if (event.error === 'not-allowed') {
            promptMicSettings();
            return;
          }
          haptics.error();
          Toast.show({
            type: 'error',
            text1: ERROR_MESSAGES[event.error] ?? 'Dictation stopped. Try again.',
          });
      }
    };

    return speech.subscribe(handle);
  }, []);

  const start = useCallback(async () => {
    if (active.current) return;
    setStarting(true);
    if (!(await speech.isAvailable())) {
      setStarting(false);
      Toast.show({ type: 'error', text1: "Dictation isn't available on this phone." });
      return;
    }
    const permission = await speech.requestPermission();
    if (permission !== 'granted') {
      setStarting(false);
      if (permission === 'blocked') promptMicSettings();
      return;
    }
    base.current = valueRef.current;
    committed.current = '';
    interim.current = '';
    lang.current = PRIMARY_LANG;
    active.current = true;
    haptics.tap();
    speech.start(PRIMARY_LANG);
  }, []);

  const stop = useCallback(() => {
    if (!active.current) return;
    haptics.tap();
    speech.stop();
  }, []);

  const sync = useCallback((text: string) => {
    if (!active.current) return;
    base.current = text;
    committed.current = '';
    interim.current = '';
  }, []);

  const toggle = useCallback(() => {
    if (active.current) stop();
    else start();
  }, [start, stop]);

  useEffect(
    () => () => {
      if (active.current) {
        active.current = false;
        speech.abort();
      }
    },
    [],
  );

  return { listening, starting, toggle, stop, sync };
}
