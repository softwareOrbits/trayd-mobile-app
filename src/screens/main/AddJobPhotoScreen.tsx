import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppToast, Button } from '@/components/ui';
import { addJobPhoto, type JobPhotoPhase } from '@/services/jobs';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { capturePhoto } from '@/utils/capturePhoto';
import { toastError, toastSuccess } from '@/utils/toast';
import type { MainStackParamList } from '@/types';

const PHASES: { key: JobPhotoPhase; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'during', label: 'Mid-job' },
  { key: 'after', label: 'After' },
];

type PhotoAsset = { uri: string; base64?: string; type?: string | null };

const AddJobPhotoScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'AddJobPhoto'>>();

  const [phase, setPhase] = useState<JobPhotoPhase>(
    params.photoCount === 0 ? 'before' : 'during',
  );
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const openCamera = async () => {
    const asset = await capturePhoto({ quality: 0.7, maxSize: 1600 });
    if (asset) setPhoto(asset);
  };

  const save = async () => {
    if (!photo?.base64 || saving) return;
    setSaving(true);
    try {
      await addJobPhoto({
        jobId: params.jobId,
        phase,
        base64: photo.base64,
        type: photo.type,
      });
      toastSuccess('Photo added.');
      navigation.goBack();
    } catch (e) {
      toastError(e, 'Could not upload the photo.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Job photo</Text>
        <Text style={styles.counter}>
          {params.photoCount + (photo ? 1 : 0)} so far
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.phaseRow}>
          {PHASES.map(p => {
            const selected = phase === p.key;
            return (
              <Pressable
                key={p.key}
                style={[styles.phasePill, selected && styles.phasePillOn]}
                onPress={() => setPhase(p.key)}
              >
                <Text
                  style={[
                    styles.phaseText,
                    selected && styles.phaseTextOn,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.photoTile} onPress={openCamera}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photoImg} />
          ) : (
            <>
              <Ionicons
                name="camera-outline"
                size={32}
                color={colors.textMuted}
              />
              <Text style={styles.photoText}>Tap to open the camera</Text>
            </>
          )}
        </Pressable>
        {photo ? (
          <Text style={styles.retakeHint}>Tap the photo to retake.</Text>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {photo ? (
          <Button
            label="Save photo"
            fullWidth
            loading={saving}
            onPress={save}
          />
        ) : (
          <Button
            label="Open camera"
            leftIcon="camera"
            fullWidth
            onPress={openCamera}
          />
        )}
      </View>
      <AppToast />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 70,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    counter: {
      width: 70,
      textAlign: 'right',
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },

    content: { flex: 1, paddingHorizontal: 20 },
    phaseRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
      marginBottom: 16,
    },
    phasePill: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingVertical: 10,
    },
    phasePillOn: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    phaseText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    phaseTextOn: { color: theme.colors.onPrimary },

    photoTile: {
      height: 320,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      overflow: 'hidden',
    },
    photoImg: { width: '100%', height: '100%' },
    photoText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.medium,
    },
    retakeHint: {
      marginTop: 10,
      textAlign: 'center',
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },

    footer: { paddingHorizontal: 20, paddingTop: 12 },
  });

export default AddJobPhotoScreen;
