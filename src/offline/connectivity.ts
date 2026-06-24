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
const listeners = new Set<(online: boolean) => void>();

const setOnline = (next: boolean) => {
  if (next === online) return;
  online = next;
  listeners.forEach(l => l(online));
};

const toOnline = (s: NetInfoState) =>
  !!s.isConnected && s.isInternetReachable !== false;

export const isOnline = () => online;

export const reportRequestOutcome = (reachable: boolean) => setOnline(reachable);

let netInfoWired = false;
const wireNetInfo = () => {
  if (netInfoWired || !netinfo) return;
  netInfoWired = true;
  netinfo
    .fetch()
    .then(s => setOnline(toOnline(s)))
    .catch(() => {});
  netinfo.addEventListener(s => setOnline(toOnline(s)));
};

export function subscribeConnectivity(
  cb: (online: boolean) => void,
): () => void {
  listeners.add(cb);
  cb(online);
  wireNetInfo();
  return () => {
    listeners.delete(cb);
  };
}
