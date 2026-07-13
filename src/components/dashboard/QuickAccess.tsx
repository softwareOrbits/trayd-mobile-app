import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import type { MainTabParamList } from '@/types';
import { useDashboard } from './DashboardProvider';

const fmtHM = (hours: number) => {
  const totalMin = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${`${m}`.padStart(2, '0')}m`;
};

export const QuickAccess = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { data } = useDashboard();
  const sheet = data?.hours ?? null;

  const progress =
    sheet && sheet.targetHours > 0
      ? Math.min(1, sheet.hours / sheet.targetHours)
      : 0;
  const title = sheet ? `This week · ${fmtHM(sheet.hours)}` : 'This week · —';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>QUICK ACCESS</Text>
      <Pressable
        style={[styles.card, styles.quickCard]}
        onPress={() => navigation.navigate('Jobs', { initialTab: 'live' })}
      >
        <View style={styles.quickTop}>
          <View style={styles.hoursIcon}>
            <Ionicons name="time-outline" size={22} color={colors.warning} />
          </View>
          <View style={styles.quickBody}>
            <View style={styles.quickTitleRow}>
              <Text style={styles.quickTitle}>{title}</Text>
              {sheet?.running ? (
                <View style={styles.runningWrap}>
                  <View style={styles.runningDot} />
                  <Text style={styles.runningText}>RUNNING</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
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
