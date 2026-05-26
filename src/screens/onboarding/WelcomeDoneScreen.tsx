import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import OnboardingScaffold from './OnboardingScaffold';

const member = {
  firstName: 'Daniel',
  name: 'Daniel Quinn',
  email: 'daniel@murphycon.ie',
  company: 'Murphy Construction',
};

const firstJob = {
  title: 'Boiler service · 14 Stoneybatter',
  meta: 'Tomorrow · 9:00 AM · with Ciaran M.',
};

const WelcomeDoneScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dispatch = useAppDispatch();

  const enter = () =>
    dispatch(
      setCredentials({
        accessToken: 'demo-token',
        user: { email: member.email, name: member.name },
      }),
    );

  return (
    <OnboardingScaffold
      icon={
        <View style={styles.check}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </View>
      }
      title={`You're in, ${member.firstName}`}
      subtitle={
        <>
          <Text style={styles.bold}>{member.company}</Text>
          {' will send jobs to you here. Your first one is waiting in the queue.'}
        </>
      }
      footer={<Button label="Enter Trayd" fullWidth onPress={enter} />}
    >
      <View style={styles.jobCard}>
        <View style={styles.jobBadge}>
          <Text style={styles.jobBadgeText}>1</Text>
        </View>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {firstJob.title}
          </Text>
          <Text style={styles.jobMeta} numberOfLines={1}>
            {firstJob.meta}
          </Text>
        </View>
      </View>
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
