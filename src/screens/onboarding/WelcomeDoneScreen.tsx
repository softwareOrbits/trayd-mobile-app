import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import OnboardingScaffold from './OnboardingScaffold';

const firstName = (fullName: string | null | undefined) =>
  fullName?.trim().split(/\s+/)[0] ?? 'there';

const WelcomeDoneScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
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

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    check: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bold: {
      color: theme.colors.text,
      fontFamily: theme.fonts.bold,
    },
    jobCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      alignSelf: 'stretch',
      marginTop: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 12,
    },
    jobBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    jobBadgeText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
    },
    jobInfo: { flex: 1, gap: 2 },
    jobTitle: {
      color: theme.colors.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
    },
    jobMeta: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.sm,
    },
  });

export default WelcomeDoneScreen;
