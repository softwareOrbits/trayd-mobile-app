type NetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
};

type NetInfoModule = {
  addEventListener: (cb: (s: NetInfoState) => void) => () => void;
  fetch: () => Promise<NetInfoState>;
};

let netinfo: NetInfoModule | null = null;
try {
  netinfo = require('@react-native-community/netinfo').default as NetInfoModule;
} catch {
  netinfo = null;
}

export const hasNativeConnectivity = () => netinfo !== null;

let online = true;

const toOnline = (s: NetInfoState) =>
  !!s.isConnected && s.isInternetReachable !== false;

export const isOnline = () => online;

export function subscribeConnectivity(
  cb: (online: boolean) => void,
): () => void {
  if (!netinfo) {
    online = true;
    cb(true);
    return () => {};
  }
  netinfo.fetch().then(s => {
    online = toOnline(s);
    cb(online);
  });
  return netinfo.addEventListener(s => {
    const next = toOnline(s);
    if (next === online) return;
    online = next;
    cb(online);
  });
}
