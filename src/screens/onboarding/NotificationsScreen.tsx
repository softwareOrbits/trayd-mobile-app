import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
import { registerPush } from '@/services/push';
import { ensurePermission } from '@/utils/permissions';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeOnboardingNotificationsStyles } from '@/styles/onboardingNotifications.styles';
import type { AuthStackParamList } from '@/types';
import { usePrimingComplete } from '@/navigation/OnboardingStack';
import OnboardingScaffold from './OnboardingScaffold';

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeOnboardingNotificationsStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const skipAll = usePrimingComplete();

  const goNext = () => navigation.navigate('OnboardLocation');

  const requestNotifications = async () => {
    // Surface the OS dialog first; registerPush only gets a token once granted.
    await ensurePermission('notifications');
    await registerPush().catch(() => {});
    goNext();
  };

  return (
    <OnboardingScaffold
      step={1}
      icon={
        <View style={styles.iconBox}>
          <Ionicons name="notifications" size={40} color={colors.primary} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </View>
      }
      title="Don't miss a job"
      subtitle="We'll ping you when you're assigned a job, when your crew chats you, and when your invoice is ready."
      footer={
        <>
          <Button
            label="Turn on notifications"
            fullWidth
            onPress={requestNotifications}
          />
          <TextLink label="Maybe later" onPress={goNext} />
          <TextLink label="Skip all setup" onPress={skipAll} />
        </>
      }
    />
  );
};

export default NotificationsScreen;
