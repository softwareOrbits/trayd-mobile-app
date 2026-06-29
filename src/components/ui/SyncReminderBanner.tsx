import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useOfflineBlocked, useSync } from '@/offline';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const SyncReminderBanner = () => {
  const blocked = useOfflineBlocked();
  const { pending } = useSync();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (!blocked) return null;

  return (
    <View style={styles.bar}>
      <Ionicons name="cloud-offline" size={18} color={colors.onPrimary} />
      <View style={styles.body}>
        <Text style={styles.title}>Offline for over 3 hours</Text>
        <Text style={styles.text}>
          {pending > 0
            ? `New changes are paused. Reconnect to sync your ${pending} pending change${pending === 1 ? '' : 's'}.`
            : 'New offline changes are paused — reconnect to keep working.'}
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
    },
    body: { flex: 1 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onPrimary,
    },
    text: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.onPrimary,
      lineHeight: 16,
      opacity: 0.95,
    },
  });

export default SyncReminderBanner;
