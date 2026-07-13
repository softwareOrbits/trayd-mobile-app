import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';

const todayLabel = (d: Date) => {
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  const dayMonth = d
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();
  return `TODAY · ${weekday} ${dayMonth}`;
};

export const TodayCard = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{todayLabel(new Date())}</Text>
      <View style={[styles.card, styles.todayCard]}>
        <View style={styles.todayIcon}>
          <Ionicons name="calendar-outline" size={26} color={colors.textMuted} />
        </View>
        <Text style={styles.todayTitle}>No jobs scheduled today</Text>
        <Text style={styles.todayText}>
          When we assign you a job or task, it'll show up here and on your
          calendar. You'll get a notification too.
        </Text>
      </View>
    </View>
  );
};

export default TodayCard;
