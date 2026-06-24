import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeNotificationsStyles } from '@/styles/notifications.styles';

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNotificationsStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>TRAYD</Text>
        <Text style={styles.eyebrow}>ALL CLEAR</Text>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.empty}>
        <View style={styles.bell}>
          <Ionicons
            name="notifications-outline"
            size={30}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>You’re up to date.</Text>
        <Text style={styles.emptyText}>
          We’ll buzz you when your office assigns a job, approves an invoice, or
          something needs your attention.
        </Text>
      </View>
    </View>
  );
};

export default NotificationsScreen;
