import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useOnline } from '@/offline';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const OfflineBanner = () => {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  if (online) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Ionicons
        name="cloud-offline-outline"
        size={15}
        color={colors.onSecondary}
      />
      <Text style={styles.text}>
        Working offline · changes sync when you reconnect
      </Text>
    </View>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.secondary,
    },
    text: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.onSecondary,
    },
  });

export default OfflineBanner;
