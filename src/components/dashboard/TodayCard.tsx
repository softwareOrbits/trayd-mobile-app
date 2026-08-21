import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDMY, weekdayShort } from '@/utils/datetime';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';

const todayLabel = (d: Date) =>
  `TODAY · ${weekdayShort(d).toUpperCase()} ${fmtDMY(d)}`;

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
