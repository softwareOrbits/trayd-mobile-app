import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';

import { fetchLeaveBalances } from '@/services/leave';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import type { LeaveBalance, MainTabParamList } from '@/types';

const fmtDays = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');

export const QuickAccess = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [balances, setBalances] = useState<LeaveBalance[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchLeaveBalances()
        .then(b => active && setBalances(b))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const entitlement =
    balances?.reduce((s, b) => s + b.entitlement, 0) ?? 0;
  const used = balances?.reduce((s, b) => s + b.used, 0) ?? 0;
  const pending = balances?.reduce((s, b) => s + b.pending, 0) ?? 0;
  const left = Math.max(0, entitlement - used - pending);
  const leaveProgress =
    entitlement > 0 ? Math.min(1, (used + pending) / entitlement) : 0;
  const leaveTitle = balances
    ? `Leave · ${fmtDays(used)} of ${fmtDays(entitlement)} days`
    : 'Leave · —';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
      <Pressable
        style={[styles.card, styles.quickCard]}
        onPress={() => navigation.navigate('Leave')}
      >
        <View style={styles.quickTop}>
          <View style={styles.leaveIcon}>
            <Ionicons name="sunny-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.quickBody}>
            <View style={styles.quickTitleRow}>
              <Text style={styles.quickTitle}>{leaveTitle}</Text>
              {balances ? (
                <Text style={styles.leaveMeta}>{fmtDays(left)}d LEFT</Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFillLeave,
                  { width: `${leaveProgress * 100}%` },
                ]}
              />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
        </View>
      </Pressable>
    </View>
  );
};

export default QuickAccess;
