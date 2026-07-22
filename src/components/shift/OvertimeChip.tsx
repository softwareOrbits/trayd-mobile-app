import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError, toastSuccess } from '@/utils/toast';
import { makeShiftStyles } from '@/styles/shift.styles';
import { refreshOvertime, setOvertimeDeclared, useOvertime } from './useOvertime';

type Props = { running: boolean };

export default function OvertimeChip({ running }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeShiftStyles);
  const { declared, stopLabel, autoStopEnabled } = useOvertime();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshOvertime().catch(() => {});
  }, []);

  if (!autoStopEnabled) return null;
  if (!running && !declared) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      await setOvertimeDeclared(!declared);
      toastSuccess(
        declared
          ? `Overtime off — timer stops at ${stopLabel}.`
          : 'Overtime on — your timer keeps running.',
      );
    } catch (e) {
      toastError(e, 'Could not update overtime.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.chip, declared && styles.chipOn]}>
      <Ionicons
        name={declared ? 'infinite' : 'time-outline'}
        size={16}
        color={declared ? colors.onPrimary : colors.textMuted}
      />
      <Text style={[styles.chipText, declared && styles.chipTextOn]}>
        {declared
          ? 'On overtime today · timer keeps running'
          : `Timer stops at ${stopLabel}`}
      </Text>
      <Pressable onPress={toggle} disabled={busy} hitSlop={8}>
        <Text
          style={[
            styles.chipAction,
            declared && styles.chipActionOn,
            busy && styles.chipBusy,
          ]}
        >
          {declared ? 'Undo' : 'Working late'}
        </Text>
      </Pressable>
    </View>
  );
}
