import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveHeaderStyles } from '@/styles/leave.styles';
import type { LeaveBalance } from '@/types';
import LeaveBalanceGrid from './LeaveBalanceGrid';

type LeaveHeaderProps = {
  balances: LeaveBalance[];
  onRequest: () => void;
};

export const LeaveHeader = ({ balances, onRequest }: LeaveHeaderProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveHeaderStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.eyebrow}>HR</Text>
      <Text style={styles.title}>Time Off</Text>

      <LeaveBalanceGrid balances={balances} />

      <Pressable
        accessibilityRole="button"
        style={styles.requestBtn}
        onPress={onRequest}
      >
        <Ionicons name="add" size={22} color={colors.onPrimary} />
        <Text style={styles.requestBtnText}>Request time off</Text>
      </Pressable>
    </View>
  );
};

export default LeaveHeader;
