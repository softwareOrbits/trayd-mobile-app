import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import {
  TIMER_AUTO_PAUSED,
  onTimerPush,
  type TimerPush,
} from '@/services/timerBus';
import {
  refreshOvertime,
  resetOvertime,
  setOvertimeDeclared,
  useOvertime,
} from './useOvertime';
import { navigationRef } from '@/navigation/navigationRef';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError } from '@/utils/toast';
import { makeShiftStyles } from '@/styles/shift.styles';

export default function AutoStopProvider() {
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(makeShiftStyles);
  const insets = useSafeAreaInsets();
  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn);

  const [prompt, setPrompt] = useState<TimerPush | null>(null);
  const [declaring, setDeclaring] = useState(false);
  const { stopLabel } = useOvertime();

  useEffect(() => {
    if (!isLoggedIn) {
      setPrompt(null);
      resetOvertime();
      return;
    }
    refreshOvertime().catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    return onTimerPush(push => {
      if (push.type === TIMER_AUTO_PAUSED) dispatch(fetchJobs());
      setPrompt(push);
    });
  }, [isLoggedIn, dispatch]);

  const dismiss = () => setPrompt(null);

  const stayOn = async () => {
    setDeclaring(true);
    try {
      await setOvertimeDeclared(true);
      setPrompt(null);
    } catch (e) {
      toastError(e, `Could not save that — your timer will stop at ${stopLabel}.`);
    } finally {
      setDeclaring(false);
    }
  };

  const goToJob = (screen: 'JobDetail' | 'WrapUpJob') => {
    const jobId = prompt?.jobId;
    setPrompt(null);
    if (!jobId || !navigationRef.isReady()) return;
    navigationRef.navigate(screen, { jobId });
  };

  const isPaused = prompt?.type === TIMER_AUTO_PAUSED;
  const close = isPaused ? () => goToJob('JobDetail') : dismiss;

  return (
    <Modal
      visible={prompt !== null}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.eyebrow}>
            {isPaused ? 'TIMER STOPPED' : 'SHIFT ENDING'}
          </Text>
          <Text style={styles.title}>
            {isPaused
              ? `Timer stopped at ${stopLabel}`
              : `Your timer stops at ${stopLabel}`}
          </Text>
          <Text style={styles.body}>
            {isPaused
              ? 'Your job is on pause. Pick it up tomorrow, or submit it now.'
              : `Your timer stops automatically at ${stopLabel} unless you're working overtime.`}
          </Text>

          {isPaused ? (
            <>
              {prompt?.jobId ? (
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => goToJob('WrapUpJob')}
                >
                  <Text style={styles.primaryText}>Submit job now</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={close}>
                <Text style={styles.secondaryText}>Pick it up tomorrow</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.primaryBtn, declaring && styles.btnBusy]}
                onPress={stayOn}
                disabled={declaring}
              >
                <Text style={styles.primaryText}>I’m working overtime</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={dismiss}>
                <Text style={styles.secondaryText}>
                  {`That’s fine, stop at ${stopLabel}`}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
