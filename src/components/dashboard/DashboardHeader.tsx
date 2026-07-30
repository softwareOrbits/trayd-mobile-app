import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';

import { fetchMyMember, type MemberProfile } from '@/services/member';
import { fetchMyVan } from '@/services/fleet';
import { fetchTasks } from '@/services/tasks';
import { useCertCompliance } from '@/compliance';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtHM, formatStamp, greetingFor } from '@/utils/datetime';
import { firstNameOf, initialsOf } from '@/utils/name';
import { makeDashboardHeaderStyles } from '@/styles/dashboard.styles';
import type { MainTabParamList, Vehicle } from '@/types';
import { useDashboard } from './DashboardProvider';

export type DashboardVariant = 'welcome' | 'active';

type StatCard = { label: string; value: string; caption: string };

const STATS: Record<DashboardVariant, [StatCard, StatCard]> = {
  welcome: [
    { label: 'TOTAL JOBS', value: '0', caption: 'this week' },
    { label: 'HOURS DONE', value: '0h 00m', caption: 'this week' },
  ],
  active: [
    { label: 'TOTAL JOBS', value: '0', caption: 'this week' },
    { label: 'HOURS DONE', value: '0h 00m', caption: 'this week' },
  ],
};

export const DashboardHeader = ({
  variant = 'active',
}: {
  variant?: DashboardVariant;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardHeaderStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const unread = useAppSelector(s => s.notifications.unread);

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [van, setVan] = useState<Vehicle | null>(null);
  const [tasksDue, setTasksDue] = useState(0);
  const { compliance } = useCertCompliance();
  const { data } = useDashboard();
  const certAlert = compliance.blockers.length > 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchMyMember()
        .then(m => active && setMember(m))
        .catch(() => {});
      fetchMyVan()
        .then(v => active && setVan(v))
        .catch(() => {});
      fetchTasks()
        .then(tasks => {
          if (!active) return;
          const today = new Date().toISOString().slice(0, 10);
          setTasksDue(
            tasks.filter(
              t =>
                t.status !== 'complete' &&
                !!t.deadlineDate &&
                t.deadlineDate <= today,
            ).length,
          );
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const now = new Date();
  const firstName = firstNameOf(member?.fullName);
  const isActive = variant === 'active';

  const greeting = isActive
    ? firstName
      ? `${greetingFor(now)}, ${firstName}.`
      : `Good ${greetingFor(now).toLowerCase()}.`
    : firstName
    ? `Welcome to Trayd, ${firstName}.`
    : 'Welcome to Trayd.';

  const jobsCard: StatCard = data
    ? { ...STATS[variant][0], value: String(data.jobsThisWeek) }
    : STATS[variant][0];

  const hoursCard: StatCard = data
    ? {
        label: 'HOURS DONE',
        value: fmtHM(data.hours.hours),
        caption: 'this week',
      }
    : STATS[variant][1];

  const stats: [StatCard, StatCard] = [jobsCard, hoursCard];

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{formatStamp(now, isActive)}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={8}
            style={styles.bellBtn}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.white}
            />
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unread > 9 ? '9+' : unread}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            hitSlop={8}
            accessibilityLabel={
              certAlert
                ? 'Profile — certifications need attention'
                : 'Profile'
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(member?.fullName)}</Text>
            </View>
            {certAlert ? (
              <View style={styles.avatarAlert}>
                <Text style={styles.avatarAlertText}>!</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <Text style={styles.greeting}>{greeting}</Text>

      {isActive && (tasksDue > 0 || van) ? (
        <Text style={styles.subtitle}>
          {tasksDue > 0 ? (
            <Text style={styles.subtitleStrong}>
              {`${tasksDue} task${tasksDue === 1 ? '' : 's'} due`}
            </Text>
          ) : null}
          {tasksDue > 0 && van ? (
            <Text style={styles.subtitleMuted}> · </Text>
          ) : null}
          {van ? (
            <>
              <Text style={styles.subtitleMuted}>driving </Text>
              <Text style={styles.subtitleReg}>{van.registration}</Text>
              <Text style={styles.subtitleMuted}> today</Text>
            </>
          ) : null}
        </Text>
      ) : null}

      {isActive ? null : (
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleStrong}>You're all set up.</Text>
          <Text style={styles.subtitleMuted}>
            {' '}We'll assign your first job soon — they'll appear right here.
          </Text>
        </Text>
      )}

      <View style={styles.statsRow}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statCaption}>{stat.caption}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default DashboardHeader;
