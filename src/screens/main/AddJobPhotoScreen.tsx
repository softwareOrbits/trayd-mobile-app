import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AppToast, Button } from '@/components/ui';
import { addJobPhotos, type JobPhotoPhase } from '@/services/jobs';
import { enqueue } from '@/offline';
import { isNetworkError } from '@/offline/errors';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAddJobPhotoStyles } from '@/styles/addJobPhoto.styles';
import { capturePhoto } from '@/utils/capturePhoto';
import { toastError, toastSuccess } from '@/utils/toast';
import { withTimeout } from '@/utils/withTimeout';
import type { MainStackParamList } from '@/types';

const PHASES: { key: JobPhotoPhase; label: string }[] = [
  { key: 'before', label: 'Before' },
  { key: 'during', label: 'Mid-job' },
  { key: 'after', label: 'After' },
];

const PHOTO_UPLOAD_TIMEOUT_MS = 20_000;

type PhotoAsset = {
  uri: string;
  base64?: string;
  type?: string | null;
  phase: JobPhotoPhase;
};

const AddJobPhotoScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAddJobPhotoStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'AddJobPhoto'>>();

  const [phase, setPhase] = useState<JobPhotoPhase>(
    params.photoCount === 0 ? 'before' : 'during',
  );
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [saving, setSaving] = useState(false);

  const openCamera = async () => {
    const asset = await capturePhoto({ quality: 0.7, maxSize: 1600 });
    if (asset) setPhotos(prev => [...prev, { ...asset, phase }]);
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    const pending = photos.filter(p => p.base64);
    if (!pending.length || saving) return;
    setSaving(true);
    const items = pending.map(p => ({
      phase: p.phase,
      base64: p.base64 as string,
      type: p.type,
    }));
    const queueOffline = async () => {
      await enqueue({
        id: `${params.jobId}:photos:${Date.now()}`,
        kind: 'job.addPhotos',
        payload: { clientId: `${params.jobId}:${Date.now()}`, jobId: params.jobId, photos: items },
      });
      toastSuccess('Saved offline — photos upload when you’re back online.');
      navigation.goBack();
    };
    try {
      const { uploaded, failed } = await withTimeout(
        addJobPhotos({ jobId: params.jobId, photos: items }),
        PHOTO_UPLOAD_TIMEOUT_MS,
      );
      if (!uploaded) {
        await queueOffline();
        return;
      }
      if (failed) {
        toastError(
          new Error('partial_upload'),
          `${failed} photo${failed === 1 ? '' : 's'} didn’t upload.`,
        );
      } else {
        toastSuccess(uploaded === 1 ? 'Photo added.' : 'Photos added.');
      }
      navigation.goBack();
    } catch (e) {
      if (isNetworkError(e)) {
        await queueOffline();
      } else {
        toastError(e, 'Could not upload the photos.');
        setSaving(false);
      }
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
          {params.photoCount + photos.length} so far
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
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
                  style={[styles.phaseText, selected && styles.phaseTextOn]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {PHASES.map(p => {
          const inPhase = photos
            .map((photo, idx) => ({ photo, idx }))
            .filter(x => x.photo.phase === p.key);
          const isActive = phase === p.key;
          if (!inPhase.length && !isActive) return null;
          return (
            <View key={p.key} style={styles.phaseSection}>
              <Text style={styles.sectionLabel}>
                {`${p.label.toUpperCase()} · ${inPhase.length}`}
              </Text>
              <View style={styles.photoGrid}>
                {inPhase.map(({ photo, idx }) => (
                  <View key={photo.uri} style={styles.photoThumb}>
                    <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                    <Pressable
                      style={styles.photoRemove}
                      onPress={() => removePhoto(idx)}
                      hitSlop={12}
                      disabled={saving}
                    >
                      <Ionicons name="close" size={15} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
                {isActive ? (
                  <Pressable
                    style={styles.photoAddTile}
                    onPress={openCamera}
                    disabled={saving}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={26}
                      color={colors.textMuted}
                    />
                    <Text style={styles.photoText}>
                      {inPhase.length ? 'Add another' : 'Add photo'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={
            photos.length > 1 ? `Save ${photos.length} photos` : 'Save photo'
          }
          fullWidth
          loading={saving}
          disabled={!photos.length}
          onPress={save}
        />
      </View>
      <AppToast />
    </View>
  );
};

export default AddJobPhotoScreen;
