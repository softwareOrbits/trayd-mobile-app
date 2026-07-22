import { useEffect, useState } from 'react';

import {
  cancelOvertime,
  declareOvertime,
  fetchAutoStopSettings,
  formatStopTime,
  isOnOvertimeToday,
} from '@/services/overtime';

export type OvertimeState = {
  declared: boolean;
  stopLabel: string;
  autoStopEnabled: boolean;
};

let state: OvertimeState = {
  declared: false,
  stopLabel: formatStopTime(null),
  autoStopEnabled: true,
};

const listeners = new Set<(next: OvertimeState) => void>();

function publish(patch: Partial<OvertimeState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
}

export async function refreshOvertime(): Promise<void> {
  const [declared, settings] = await Promise.all([
    isOnOvertimeToday(),
    fetchAutoStopSettings(),
  ]);
  publish({
    declared,
    stopLabel: formatStopTime(settings.stopTime),
    autoStopEnabled: settings.enabled,
  });
}

export async function setOvertimeDeclared(next: boolean): Promise<void> {
  if (next) await declareOvertime();
  else await cancelOvertime();
  publish({ declared: next });
}

export function resetOvertime(): void {
  publish({ declared: false });
}

export function useOvertime(): OvertimeState {
  const [local, setLocal] = useState(state);
  useEffect(() => {
    setLocal(state);
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  return local;
}
