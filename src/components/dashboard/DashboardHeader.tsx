import { useCallback, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';

import { fetchMyMember, type MemberProfile } from '@/services/member';
import { useCertCompliance } from '@/compliance';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { formatStamp } from '@/utils/datetime';
import { makeDashboardHeaderStyles } from '@/styles/dashboard.styles';
import type { MainTabParamList } from '@/types';
import { useDashboard } from './DashboardProvider';

export type DashboardVariant = 'welcome' | 'active';

type StatCard = { label: string; value: string; caption: string };

const STATS: Record<DashboardVariant, [StatCard, StatCard]> = {
  welcome: [
    { label: 'TOTAL JOBS', value: '0', caption: 'this week' },
    { label: 'LEAVE LEFT', value: '21d', caption: 'of 21 · 2025' },
  ],
  active: [
    { label: 'TOTAL JOBS', value: '0', caption: 'this week' },
    { label: 'LEAVE LEFT', value: '0d', caption: 'of 21 · 2026' },
  ],
};

const greetingFor = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

const firstNameOf = (fullName?: string | null) => {
  const name = (fullName ?? '').trim();
  return name ? name.split(/\s+/)[0] : '';
};

/** Half-days are real (0.5) — show them, but don't print "21.0d". */
const fmtDays = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');

const initialsOf = (fullName?: string | null) => {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
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
  const { compliance } = useCertCompliance();
  const { data } = useDashboard();
  const certAlert = compliance.blockers.length > 0;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchMyMember()
        .then(m => active && setMember(m))
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

  const leaveCard: StatCard = data
    ? {
        label: 'LEAVE LEFT',
        value: `${fmtDays(Math.max(0, data.leave.left))}d`,
        caption: `of ${fmtDays(data.leave.entitlement)} · ${data.leave.year}`,
      }
    : STATS[variant][1];

  const stats: [StatCard, StatCard] = [jobsCard, leaveCard];

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <View style={styles.topRow}>
        <Image
          source={require('@assets/images/sidebar_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
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

      <Text style={styles.eyebrow}>{formatStamp(now, isActive)}</Text>
      <Text style={styles.greeting}>{greeting}</Text>

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
