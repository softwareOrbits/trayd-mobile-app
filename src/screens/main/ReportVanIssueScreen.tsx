import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { Button, InfoCard } from '@/components/ui';
import {
  fetchMyVan,
  fetchOwnerFirstName,
  reportVanIssue,
} from '@/services/fleet';
import { navigationRef } from '@/navigation/navigationRef';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { acquirePhotos, type CapturedPhoto } from '@/utils/capturePhoto';
import { goBackSafe } from '@/utils/navigation';
import { toastError } from '@/utils/toast';
import { makeReportVanIssueStyles } from '@/styles/reportVanIssue.styles';
import type { MainStackParamList, VanIssueKind, Vehicle } from '@/types';

const KINDS: { key: VanIssueKind; label: string }[] = [
  { key: 'issue', label: 'Issue' },
  { key: 'damage', label: 'Damage' },
  { key: 'service', label: 'Service needed' },
  { key: 'other', label: 'Other' },
];

const MAX_PHOTOS = 3;

const ReportVanIssueScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeReportVanIssueStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'ReportVanIssue'>>();

  const [van, setVan] = useState<Vehicle | null>(null);
  const [vanLoaded, setVanLoaded] = useState(false);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [kind, setKind] = useState<VanIssueKind>('issue');
  const [kindSheet, setKindSheet] = useState(false);
  const [description, setDescription] = useState('');
  const [drivable, setDrivable] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyVan()
      .then(v => active && setVan(v))
      .catch(() => {})
      .finally(() => active && setVanLoaded(true));
    fetchOwnerFirstName()
      .then(name => active && setOwnerName(name))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [params?.vehicleId]);

  const owner = ownerName ?? 'the office';
  const vehicleId = params?.vehicleId ?? van?.id ?? null;
  const canSend =
    !!vehicleId && !!description.trim() && drivable !== null && !sending;

  const addPhotos = async () => {
    const assets = await acquirePhotos({
      quality: 0.7,
      maxSize: 1600,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (assets.length) {
      setPhotos(prev => [...prev, ...assets].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  const send = async () => {
    if (!canSend || !vehicleId) return;
    setSending(true);
    try {
      await reportVanIssue({
        vehicleId,
        kind,
        description,
        drivable: drivable !== false,
        photos: photos.map(p => ({ base64: p.base64, type: p.type })),
      });
      goBackSafe(navigation);
      Toast.show({
        type: 'trayd',
        text1: 'Issue logged',
        text2: 'TAP TO VIEW THE VAN LOG',
        props: {
          onPress: () => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('VanLog', { vehicleId });
            }
          },
        },
      });
    } catch (e) {
      toastError(e, 'Could not send the report.');
      setSending(false);
    }
  };

  const kindLabel = KINDS.find(k => k.key === kind)?.label ?? 'Issue';
  const registration = van && van.id === vehicleId ? van.registration : null;

  const header = (
    <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={styles.backBtn}
        onPress={() => goBackSafe(navigation)}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.secondary} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerEyebrow}>
          {registration ? `VAN · ${registration}` : 'VAN LOG'}
        </Text>
        <Text style={styles.headerTitle}>Report an issue</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (vanLoaded && !vehicleId) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.noVanWrap}>
          <InfoCard
            icon="bus-outline"
            title="No van assigned yet"
            description={`Ask ${owner} to assign you a van before reporting an issue against it.`}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>VEHICLE</Text>
        <View style={styles.pill}>
          <Ionicons name="bus-outline" size={17} color={colors.secondary} />
          {registration ? (
            <>
              <Text style={styles.pillValue}>{registration}</Text>
              <Text style={styles.pillMeta}>your van</Text>
            </>
          ) : (
            <ActivityIndicator size="small" color={colors.secondary} />
          )}
        </View>

        <Text style={styles.label}>WHAT IS IT?</Text>
        <Pressable style={styles.pill} onPress={() => setKindSheet(true)}>
          <Text style={styles.pillValue}>{kindLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.label}>WHAT'S WRONG? · REQUIRED</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. Coolant warning light came on twice on the motorway this morning"
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>CAN YOU STILL DRIVE IT?</Text>
        <View style={styles.drivableRow}>
          <Pressable
            style={[
              styles.drivableCard,
              drivable === true && styles.drivableCardOnYes,
            ]}
            onPress={() => setDrivable(true)}
          >
            <Text style={styles.drivableTitle}>Yes, drivable</Text>
            <Text style={styles.drivableSub}>watching it</Text>
          </Pressable>
          <Pressable
            style={[
              styles.drivableCard,
              drivable === false && styles.drivableCardOnNo,
            ]}
            onPress={() => setDrivable(false)}
          >
            <Text style={styles.drivableTitle}>No — off the road</Text>
            <Text style={styles.drivableSub}>flag as urgent</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>PHOTO · OPTIONAL</Text>
        <View style={styles.photoRow}>
          {photos.map((photo, idx) => (
            <View key={photo.uri} style={styles.photoThumb}>
              <Image source={{ uri: photo.uri }} style={styles.photoImg} />
              <Pressable
                style={styles.photoRemove}
                onPress={() => removePhoto(idx)}
                hitSlop={12}
                disabled={sending}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable
              style={styles.photoAddTile}
              onPress={addPhotos}
              disabled={sending}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={colors.textMuted}
              />
              <Text style={styles.photoAddText}>
                {photos.length ? 'Add another' : 'Add photo'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={`Send to ${owner}`}
          leftIcon="send"
          fullWidth
          loading={sending}
          disabled={!canSend}
          onPress={send}
        />
        <Text style={styles.tagline}>
          {`${owner} gets a push notification · added to the van's maintenance log`}
        </Text>
      </View>

      <Modal
        visible={kindSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setKindSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setKindSheet(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>What is it?</Text>
            {KINDS.map(k => (
              <Pressable
                key={k.key}
                style={styles.sheetRow}
                onPress={() => {
                  setKind(k.key);
                  setKindSheet(false);
                }}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    k.key === kind && styles.sheetRowActive,
                  ]}
                >
                  {k.label}
                </Text>
                {k.key === kind ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReportVanIssueScreen;
