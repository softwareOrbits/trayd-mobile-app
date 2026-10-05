import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';
import { BASE_URL } from '@env';

import { supabase } from '@/services/supabase';
import { savePdfAndShare } from '@/services/pdf';
import {
  buildBootstrapScript,
  NativeMessage,
  type NativeInboundMessage,
} from '@/webview/session-bridge';
import type { AskDocumentRef } from '@/types';

const TypedWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebView> }
>;

const TIMEOUT_MS = 45000;

const DOCUMENT_LABEL: Record<AskDocumentRef['type'], string> = {
  invoice: 'invoice',
  quotation: 'quotation',
};

const documentPath = (document: AskDocumentRef) =>
  document.type === 'quotation'
    ? `/app/quotes/job/${document.id}/pdf`
    : `/app/invoices/${document.id}?download=1`;

export const AskPdfWebView = ({
  document,
  onDone,
  onError,
}: {
  document: AskDocumentRef;
  onDone: () => void;
  onError: (message: string) => void;
}) => {
  const [bootstrap, setBootstrap] = useState<string | null>(null);
  const finished = useRef(false);
  const label = DOCUMENT_LABEL[document.type];

  const finish = (error?: string) => {
    if (finished.current) return;
    finished.current = true;
    if (error) onError(error);
    else onDone();
  };

  useEffect(() => {
    if (!BASE_URL) {
      finish(`The ${label} service isn’t configured.`);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) setBootstrap(buildBootstrapScript(data.session));
      else finish('Please sign in again to download the PDF.');
    });
    const timer = setTimeout(
      () => finish('The PDF took too long to prepare. Please try again.'),
      TIMEOUT_MS,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: NativeInboundMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type !== NativeMessage.SAVE_PDF) return;
    savePdfAndShare(msg.filename, msg.base64)
      .then(() => finish())
      .catch(() => finish('Could not save the PDF.'));
  };

  if (!bootstrap) return null;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <TypedWebView
        source={{
          uri: `${BASE_URL.replace(/\/+$/, '')}${documentPath(document)}`,
        }}
        originWhitelist={['*']}
        injectedJavaScriptBeforeContentLoaded={bootstrap}
        onMessage={onMessage}
        onError={() => finish(`Could not load the ${label}.`)}
        onHttpError={() => finish(`Could not load the ${label}.`)}
        domStorageEnabled
        javaScriptEnabled
        style={styles.web}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 390,
    height: 760,
    opacity: 0,
  },
  web: { width: 390, height: 760 },
});

export default AskPdfWebView;
