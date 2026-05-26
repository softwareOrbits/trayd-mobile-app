import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '@/store/hooks';
import { signOut } from '@/store/authSlice';
import { Button } from '@/components/ui';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

const ProfileScreen = () => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Profile</Text>
      <Button
        label="Log out"
        variant="outlined"
        color="secondary"
        leftIcon="log-out-outline"
        onPress={() => dispatch(signOut())}
      />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      gap: 24,
      paddingHorizontal: 16,
    },
    title: {
      color: theme.colors.text,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
    },
  });

export default ProfileScreen;
