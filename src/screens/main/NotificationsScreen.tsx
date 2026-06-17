import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    logo: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      letterSpacing: 1.5,
      color: theme.colors.secondary,
    },
    eyebrow: {
      marginTop: 12,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.4,
      color: theme.colors.textMuted,
    },
    title: {
      marginTop: 2,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    bell: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    emptyText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

export default NotificationsScreen;
