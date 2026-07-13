import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';

export const QuickActions = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
      <View style={[styles.card, styles.hoursRow]}>
        <View style={styles.hoursIcon}>
          <Ionicons name="time-outline" size={22} color={colors.warning} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.hoursTitle}>This week · 0h 00m</Text>
          <Text style={styles.hoursSub}>
            Your hours start tracking once you're on a job
          </Text>
        </View>
      </View>
    </View>
  );
};

export default QuickActions;
