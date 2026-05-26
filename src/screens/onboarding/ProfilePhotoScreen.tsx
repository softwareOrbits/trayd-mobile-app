import { StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';
import OnboardingScaffold from './OnboardingScaffold';

const ProfilePhotoScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const next = () => navigation.navigate('OnboardDone');

  return (
    <OnboardingScaffold
      step={3}
      icon={
        <View style={styles.avatar}>
          <Ionicons name="person" size={56} color={colors.textMuted} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={colors.secondary} />
          </View>
        </View>
      }
      title="Add a profile photo"
      subtitle="Helps your crew recognise you on chat and on the site."
      footer={
        <>
          <Button label="Take a photo" fullWidth onPress={next} />
          <Button
            label="Upload from library"
            variant="outlined"
            color="secondary"
            fullWidth
            onPress={next}
          />
          <TextLink label="Skip for now" onPress={next} />
        </>
      }
    />
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      backgroundColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: theme.colors.background,
    },
  });

export default ProfilePhotoScreen;
