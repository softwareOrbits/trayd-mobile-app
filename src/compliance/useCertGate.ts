import { useCallback } from 'react';
import Toast from 'react-native-toast-message';

import { summariseBlocker } from '@/services/certCompliance';
import { navigationRef } from '@/navigation/navigationRef';
import { useCertCompliance } from './CertComplianceProvider';

/**
 * Guard for the actions that put a lad on the clock (start / resume). Mirrors
 * `offlineActionBlocked` — returns true when the action must not proceed, and
 * tells the user why.
 */
export function useCertGate(): () => boolean {
  const { compliance } = useCertCompliance();

  return useCallback(() => {
    const { blockers } = compliance;
    if (!blockers.length) return false;

    Toast.show({
      type: 'error',
      text1: 'You can’t start a job yet',
      text2:
        blockers.length === 1
          ? `${summariseBlocker(blockers[0])}. Tap to sort it out.`
          : `${blockers.length} certifications need sorting. Tap to see them.`,
      onPress: () => {
        Toast.hide();
        if (navigationRef.isReady()) navigationRef.navigate('Certifications');
      },
    });
    return true;
  }, [compliance]);
}

export default useCertGate;
