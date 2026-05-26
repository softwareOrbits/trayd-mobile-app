import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

export const AssistantAvatar = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.avatar}>
      <Ionicons name="sparkles" size={15} color={colors.primary} />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      width: 30,
      height: 30,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondary,
    },
  });

export default AssistantAvatar;
