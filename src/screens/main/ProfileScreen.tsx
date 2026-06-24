import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';

import Toast from 'react-native-toast-message';

import { AppToast, Avatar, Button, Input } from '@/components/ui';
import {
  WEEK_DAYS,
  fetchMemberStats,
  fetchMyMember,
  parseServiceArea,
  parseWorkingHours,
  profilePhotoUrl,
  updateMyPhone,
  uploadProfilePhoto,
  type MemberProfile,
  type MemberStats,
} from '@/services/member';
import { staticMapUrl } from '@/services/places';
import { APP_VERSION } from '@/utils/appInfo';
import { hasQueuedActions } from '@/services/outbox';
import { useAppDispatch } from '@/store/hooks';
import { signOut } from '@/store/authSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeProfileStyles } from '@/styles/profile.styles';
import { toastError } from '@/utils/toast';
import type { MainStackParamList } from '@/types';

/** Compact summary of the working-hours column for the profile row. */
const summariseHours = (raw: unknown): string => {
  const wh = parseWorkingHours(raw);
  const on = WEEK_DAYS.filter(d => wh[d.key].enabled);
  if (!on.length) return 'Not set';
  const first = wh[on[0].key];
  const idxs = on.map(d => WEEK_DAYS.findIndex(w => w.key === d.key));
  const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
  const label =
    on.length === 1
      ? on[0].label
      : contiguous
      ? `${on[0].label}–${on[on.length - 1].label}`
      : `${on.length} days`;
  return `${label} · ${first.start}–${first.end}`;
};

/** Compact summary of the service-area column for the profile row. */
const summariseArea = (raw: unknown): string => {
  const sa = parseServiceArea(raw);
  const primary = sa.primary ?? sa.additional[0] ?? null;
  if (!primary) return 'Not set';
  const extra = sa.additional.length
    ? ` +${sa.primary ? sa.additional.length : sa.additional.length - 1}`
    : '';
  return `${primary}${extra}`.trim();
};

const fmtHours = (h: number) => `${Math.round(h)}h`;

const ProfileScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeProfileStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notify, setNotify] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchMyMember()
        .then(m => {
          if (!active) return;
          setMember(m);
          profilePhotoUrl(m.photoPath)
            .then(url => active && setPhotoUrl(url))
            .catch(() => {});
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

  const openPhone = () => {
    setPhoneDraft(member?.phone ?? '');
    setPhoneModal(true);
  };

  const savePhone = async () => {
    if (phoneSaving) return;
    setPhoneSaving(true);
    try {
      const next = phoneDraft.trim();
      await updateMyPhone(next);
      setMember(m => (m ? { ...m, phone: next || null } : m));
      setPhoneModal(false);
      Toast.show({ type: 'success', text1: 'Phone updated.' });
    } catch (e) {
      toastError(e, 'Could not update phone.');
    } finally {
      setPhoneSaving(false);
    }
  };

  const handlePhotoAsset = async (asset: Asset | undefined) => {
    if (!asset?.base64) {
      Toast.show({ type: 'error', text1: "Couldn't read that image." });
      return;
    }
    setPhotoUploading(true);
    try {
      const path = await uploadProfilePhoto({
        base64: asset.base64,
        type: asset.type,
      });
      setMember(m => (m ? { ...m, photoPath: path } : m));
      setPhotoUrl(asset.uri ?? null);
      Toast.show({ type: 'success', text1: 'Profile photo updated.' });
    } catch (e) {
      toastError(e, "Couldn't upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const takePhoto = async () => {
    setPhotoSheet(false);
    const res = await launchCamera({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1024,
      maxHeight: 1024,
      cameraType: 'front',
    });
    if (res.didCancel) return;
    if (res.errorCode) {
      Toast.show({ type: 'error', text1: res.errorMessage ?? 'Camera error.' });
      return;
    }
    handlePhotoAsset(res.assets?.[0]);
  };

  const pickPhoto = async () => {
    setPhotoSheet(false);
    const res = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 1,
    });
    if (res.didCancel) return;
    if (res.errorCode) {
      Toast.show({ type: 'error', text1: res.errorMessage ?? 'Library error.' });
      return;
    }
    handlePhotoAsset(res.assets?.[0]);
  };

  const serviceArea = parseServiceArea(member?.serviceArea);
  const areaMapUrl = staticMapUrl(
    [serviceArea.primary, ...serviceArea.additional].filter(
      (v): v is string => !!v,
    ),
    { width: 640, height: 260 },
  );

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
          { paddingTop: insets.top + 16 },
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
          <Pressable
            onPress={() => setPhotoSheet(true)}
            disabled={photoUploading}
            style={styles.avatarWrap}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Avatar name={member?.fullName ?? 'U'} size={52} />
            )}
            <View style={styles.avatarBadge}>
              {photoUploading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <Ionicons name="camera" size={12} color={colors.secondary} />
              )}
            </View>
          </Pressable>
          <View style={styles.identityText}>
            <Text style={styles.name}>{member?.fullName ?? 'You'}</Text>
            <Text style={styles.sub}>
              {[member?.companyName, member?.roleName]
                .filter(Boolean)
                .join(' · ') || '—'}
            </Text>
            <View
              style={[styles.syncBadge, queued && styles.syncBadgeQueued]}
            >
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: queued ? colors.warning : colors.green },
                ]}
              />
              <Text
                style={[styles.syncBadgeText, queued && styles.syncBadgeTextQueued]}
              >
                {queued ? 'CHANGES QUEUED' : 'ALL SYNCED'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          {[
            { label: 'JOBS', value: String(stats?.jobs ?? 0) },
            { label: 'HOURS', value: fmtHours(stats?.hours ?? 0) },
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
          {row('Phone', member?.phone ?? 'Not set', {
            onPress: openPhone,
            muted: !member?.phone,
          })}
        </View>

        {/* Work setup */}
        <Text style={styles.section}>WORK SETUP</Text>
        <View style={styles.card}>
          {row('Working hours', summariseHours(member?.workingHours), {
            onPress: () => navigation.navigate('WorkingHours'),
          })}
          <View style={styles.divider} />
          {row('Service area', summariseArea(member?.serviceArea), {
            onPress: () => navigation.navigate('ServiceArea'),
          })}
          {areaMapUrl ? (
            <Pressable onPress={() => navigation.navigate('ServiceArea')}>
              <Image
                source={{ uri: areaMapUrl }}
                style={styles.areaMap}
                resizeMode="cover"
              />
            </Pressable>
          ) : null}
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

        <Text style={styles.buildInfo}>
          {`Trayd v${APP_VERSION}`}
        </Text>
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
            <View style={styles.handle} />
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

      <Modal
        visible={phoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPhoneModal(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handle} />
            <View style={styles.modalIcon}>
              <Ionicons name="call-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Phone number</Text>
            <Text style={styles.modalText}>
              The office uses this to reach you about jobs.
            </Text>
            <View style={styles.phoneField}>
              <Input
                value={phoneDraft}
                onChangeText={setPhoneDraft}
                keyboardType="phone-pad"
                placeholder="+353 …"
                autoFocus
              />
            </View>
            <Button
              label="Save"
              fullWidth
              loading={phoneSaving}
              onPress={savePhone}
            />
            <Pressable
              onPress={() => setPhoneModal(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={photoSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoSheet(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPhotoSheet(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handle} />
            <View style={styles.modalIcon}>
              <Ionicons name="camera-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.modalTitle}>Profile photo</Text>
            <Text style={styles.modalText}>
              Helps your crew recognise you on chat and on the site.
            </Text>
            <Button label="Take a photo" fullWidth onPress={takePhoto} />
            <Button
              label="Choose from library"
              variant="outlined"
              color="secondary"
              fullWidth
              onPress={pickPhoto}
            />
            <Pressable
              onPress={() => setPhotoSheet(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AppToast />
    </View>
  );
};

export default ProfileScreen;
