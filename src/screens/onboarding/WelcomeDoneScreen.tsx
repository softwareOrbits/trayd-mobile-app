import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { Button } from '@/components/ui';
import { supabase } from '@/services/supabase';
import {
  fetchMyMember,
  fetchMyNextJob,
  type MemberProfile,
  type NextJob,
} from '@/services/member';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeWelcomeDoneStyles } from '@/styles/welcomeDone.styles';
import OnboardingScaffold from './OnboardingScaffold';

const firstName = (fullName: string | null | undefined) =>
  fullName?.trim().split(/\s+/)[0] ?? 'there';

const WelcomeDoneScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeWelcomeDoneStyles);
  const dispatch = useAppDispatch();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [nextJob, setNextJob] = useState<NextJob | null>(null);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyMember()
      .then(m => {
        if (!active) return;
        setMember(m);
        return fetchMyNextJob(m.id).then(j => active && setNextJob(j));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const enter = async () => {
    setEntering(true);
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setEntering(false);
      Toast.show({ type: 'error', text1: 'Session expired. Please log in.' });
      return;
    }
    dispatch(
      setCredentials({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: {
          id: data.session.user.id,
          email: member?.email ?? data.session.user.email ?? undefined,
          name: member?.fullName ?? undefined,
          photo: member?.photoPath ?? undefined,
        },
      }),
    );
  };

  return (
    <OnboardingScaffold
      icon={
        <View style={styles.check}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </View>
      }
      title={`You're in, ${firstName(member?.fullName)}`}
      subtitle={
        member?.companyName ? (
          <>
            <Text style={styles.bold}>{member.companyName}</Text>
            {' will send jobs to you here.'}
            {nextJob ? ' Your first one is waiting in the queue.' : ''}
          </>
        ) : (
          "You're all set. Jobs will show up here."
        )
      }
      footer={
        <Button
          label="Enter Trayd"
          fullWidth
          loading={entering}
          onPress={enter}
        />
      }
    >
      {nextJob ? (
        <View style={styles.jobCard}>
          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeText}>1</Text>
          </View>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {nextJob.title}
            </Text>
            {nextJob.meta ? (
              <Text style={styles.jobMeta} numberOfLines={1}>
                {nextJob.meta}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </OnboardingScaffold>
  );
};

export default WelcomeDoneScreen;
