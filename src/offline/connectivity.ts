import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const OFFLINE_LIMIT_MS = 3 * 60 * 60 * 1000;
const LAST_ONLINE_KEY = 'connectivity:lastonline:v1';

let online = true;
let lastOnlineAt = Date.now();
let lastPersistAt = 0;
const listeners = new Set<(online: boolean) => void>();

const markOnlineNow = () => {
  lastOnlineAt = Date.now();
  if (lastOnlineAt - lastPersistAt >= 60_000) {
    lastPersistAt = lastOnlineAt;
    AsyncStorage.setItem(LAST_ONLINE_KEY, String(lastOnlineAt)).catch(() => {});
  }
};

let lastOnlineLoaded = false;
const loadLastOnline = () => {
  if (lastOnlineLoaded) return;
  lastOnlineLoaded = true;
  AsyncStorage.getItem(LAST_ONLINE_KEY)
    .then(raw => {
      const v = raw ? Number(raw) : NaN;
      if (!Number.isNaN(v) && v < lastOnlineAt) lastOnlineAt = v;
    })
    .catch(() => {});
};

const setOnline = (next: boolean) => {
  if (next === online) return;
  online = next;
  markOnlineNow();
  listeners.forEach(l => l(online));
};

const toOnline = (s: NetInfoState) => s.isConnected !== false;

export const isOnline = () => online;

export const getLastOnlineAt = () => lastOnlineAt;

export const isOfflineLimitExceeded = () =>
  !online && Date.now() - lastOnlineAt > OFFLINE_LIMIT_MS;

export const reportRequestOutcome = (reachable: boolean) => {
  if (reachable) {
    markOnlineNow();
    setOnline(true);
    return;
  }
  if (netinfo) {
    netinfo
      .fetch()
      .then(s => setOnline(toOnline(s)))
      .catch(() => {});
    return;
  }
  setOnline(false);
};

let netInfoWired = false;
const wireNetInfo = () => {
  if (netInfoWired || !netinfo) return;
  netInfoWired = true;
  loadLastOnline();
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
