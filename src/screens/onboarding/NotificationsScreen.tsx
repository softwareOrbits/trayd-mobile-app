import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AmberButton,
  HeroNotifications,
  OnbLink,
} from '@/components/onboarding';
import { registerPush } from '@/services/push';
import { ensurePermission } from '@/utils/permissions';
import type { AuthStackParamList } from '@/types';
import { usePrimingComplete } from '@/navigation/OnboardingStack';
import OnboardingScaffold from './OnboardingScaffold';

const NotificationsScreen = () => {
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
      icon={<HeroNotifications />}
      title="Don't miss a job"
      subtitle="We'll ping you when you're assigned a job, when your crew chats you, and when your invoice is ready."
      footer={
        <>
          <AmberButton
            label="Turn on notifications"
            onPress={requestNotifications}
          />
          <OnbLink label="Maybe later" onPress={goNext} />
          <OnbLink label="Skip all setup" onPress={skipAll} />
        </>
      }
    />
  );
};

export default NotificationsScreen;
