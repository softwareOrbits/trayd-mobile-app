import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Avatar, Button } from '@/components/ui';
import {
  fetchMemberStats,
  fetchMyMember,
  type MemberProfile,
  type MemberStats,
} from '@/services/member';
import { hasQueuedActions } from '@/services/outbox';
import { useAppDispatch } from '@/store/hooks';
import { signOut } from '@/store/authSlice';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { MainStackParamList } from '@/types';

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Best-effort summary of the `working_hours` JSON column (shape unconfirmed). */
const summariseHours = (raw: unknown): string => {
  if (!raw) return 'Not set';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, { start?: string; end?: string; enabled?: boolean }>;
    const on = Object.entries(obj).filter(([, v]) => v?.enabled !== false && (v?.start || v?.end));
    if (!on.length) return 'Not set';
    const first = on[0][1];
    const days = on
      .map(([k]) => {
        const idx = DAY_LABEL.findIndex(d => d.toLowerCase() === k.slice(0, 3).toLowerCase());
        return idx;
      })
      .filter(i => i >= 0)
      .sort((a, b) => a - b);
    const range =
      days.length > 1
        ? `${DAY_LABEL[days[0]]}–${DAY_LABEL[days[days.length - 1]]}`
        : DAY_LABEL[days[0]] ?? '';
    const times = first?.start && first?.end ? ` · ${first.start}–${first.end}` : '';
    return `${range}${times}`.trim() || 'Set';
  }
  return 'Not set';
};

/** Best-effort summary of the `service_area` JSON column (shape unconfirmed). */
const summariseArea = (raw: unknown): string => {
  if (!raw) return 'Not set';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return (raw[0] as string) ?? 'Not set';
  if (typeof raw === 'object') {
    const obj = raw as { primary?: string; primary_location?: string };
    return obj.primary ?? obj.primary_location ?? 'Set';
  }
  return 'Not set';
};

const fmtHours = (h: number) => `${Math.round(h)}h`;
const fmtMoney = (n: number) => `€${Math.round(n)}`;

const ProfileScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchMyMember()
        .then(m => {
          if (!active) return;
          setMember(m);
          fetchMemberStats(m.id)
            .then(s => active && setStats(s))
            .catch(() => {});
        })
        .catch(() => {})
        .finally(() => active && setLoading(false));
      hasQueuedActions().then(q => active && setQueued(q));
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  const row = (
    label: string,
    value: string,
    opts?: { onPress?: () => void; muted?: boolean },
  ) => (
    <Pressable
      style={styles.row}
      onPress={opts?.onPress}
      disabled={!opts?.onPress}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, opts?.muted && styles.rowMuted]}>
          {value}
        </Text>
      </View>
      {opts?.onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          {[member?.fullName, member?.roleName]
            .filter(Boolean)
            .join(' · ')
            .toUpperCase() || 'PROFILE'}
        </Text>
        <Text style={styles.title}>Profile</Text>

        {/* Identity */}
        <View style={styles.identity}>
          <Avatar name={member?.fullName ?? 'U'} size={52} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{member?.fullName ?? 'You'}</Text>
            <Text style={styles.sub}>
              {[member?.companyName, member?.roleName]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            { label: 'JOBS', value: String(stats?.jobs ?? 0) },
            { label: 'HOURS', value: fmtHours(stats?.hours ?? 0) },
            { label: 'MATERIALS', value: fmtMoney(stats?.materials ?? 0) },
          ].map((s, i) => (
            <View key={s.label} style={styles.statCell}>
              {i > 0 ? <View style={styles.statDivider} /> : null}
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Account */}
        <Text style={styles.section}>ACCOUNT</Text>
        <View style={styles.card}>
          {row('Email', member?.email ?? '—')}
          <View style={styles.divider} />
          {row('Password', 'Tap to change', {
            onPress: () => navigation.navigate('ChangePassword'),
          })}
          <View style={styles.divider} />
          {row('Phone', member?.phone ?? 'Not set')}
        </View>

        {/* Work setup */}
        <Text style={styles.section}>WORK SETUP</Text>
        <View style={styles.card}>
          {row('Working hours', summariseHours(member?.workingHours))}
          <View style={styles.divider} />
          {row('Service area', summariseArea(member?.serviceArea))}
        </View>

        {/* Sync + notifications */}
        <Text style={styles.section}>SYNC STATE</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.syncRow}>
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: queued ? colors.warning : colors.green },
                ]}
              />
              <Text style={styles.rowValue}>
                {queued ? 'Changes queued offline' : 'All synced'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowValue}>
                Job assignments, approvals &amp; chat
              </Text>
            </View>
            <Switch
              value={notify}
              onValueChange={setNotify}
              trackColor={{ true: colors.primary, false: colors.borderMuted }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={styles.logoutWrap}>
          <Button
            label="Log out"
            variant="outlined"
            color="secondary"
            leftIcon="log-out-outline"
            fullWidth
            onPress={() => setConfirmLogout(true)}
          />
          <Text style={styles.logoutHint}>
            You’ll need to sign in again. Queued submissions stay safe on your
            phone.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={confirmLogout}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmLogout(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirmLogout(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="log-out-outline" size={26} color={colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Log out of Trayd?</Text>
            <Text style={styles.modalText}>
              You’ll need to sign back in with your email and password.
            </Text>
            {queued ? (
              <View style={styles.modalWarn}>
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <Text style={styles.modalWarnText}>
                  Items queued offline stay safe and sync when you’re back —
                  don’t reinstall the app.
                </Text>
              </View>
            ) : null}
            <Pressable
              style={styles.logoutConfirm}
              onPress={() => {
                setConfirmLogout(false);
                dispatch(signOut());
              }}
            >
              <Text style={styles.logoutConfirmText}>Yes, log me out</Text>
            </Pressable>
            <Pressable
              onPress={() => setConfirmLogout(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20 },
    eyebrow: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.4,
      color: theme.colors.textMuted,
    },
    title: {
      marginTop: 4,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 16,
    },
    identityText: { flex: 1, gap: 2 },
    name: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    sub: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    statsCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.lg,
      paddingVertical: 18,
      marginTop: 18,
    },
    statCell: { flex: 1, alignItems: 'center', gap: 4 },
    statDivider: {
      position: 'absolute',
      left: 0,
      top: '15%',
      height: '70%',
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    statValue: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onSecondary,
    },
    statLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.onSecondary,
      opacity: 0.7,
    },

    section: {
      marginTop: 24,
      marginBottom: 8,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    rowBody: { flex: 1, gap: 3 },
    rowLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    rowValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    rowMuted: { color: theme.colors.textMuted },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    syncDot: { width: 8, height: 8, borderRadius: 4 },

    logoutWrap: { marginTop: 28, gap: 10 },
    logoutHint: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 17,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 24,
      gap: 12,
      alignItems: 'center',
    },
    modalIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    modalText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    modalWarn: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.md,
      padding: 12,
    },
    modalWarnText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 18,
    },
    logoutConfirm: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.radii.md,
      paddingVertical: 14,
    },
    logoutConfirmText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.error,
    },
    cancelBtn: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderRadius: theme.radii.md,
      paddingVertical: 14,
    },
    modalCancelText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
  });

export default ProfileScreen;
