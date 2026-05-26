import { StyleSheet, View } from 'react-native';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const NotificationsScreen = () => {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.container} />;
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
  });

export default NotificationsScreen;
