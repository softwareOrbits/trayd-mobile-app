import { useCallback, useEffect, useRef } from 'react';
import { useDictation } from '@/utils/useDictation';

export type WebDictateAction = 'start' | 'stop';

export function useWebDictationBridge(inject: (script: string) => void) {
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const send = useCallback((event: unknown) => {
    injectRef.current(
      `window.__traydDictationEvent && window.__traydDictationEvent(${JSON.stringify(event)}); true;`,
    );
  }, []);

  const dictation = useDictation('', text => send({ type: 'text', text }));
  const { listening, toggle, stop } = dictation;

  useEffect(() => {
    send({ type: 'state', listening });
  }, [listening, send]);

  return useCallback(
    (action: WebDictateAction) => {
      if (action === 'stop') stop();
      else if (!listening) toggle();
    },
    [listening, stop, toggle],
  );
}
