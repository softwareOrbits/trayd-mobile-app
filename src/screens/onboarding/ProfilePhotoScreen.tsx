import { useState } from 'react';
import { Image, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
import {
  capturePhoto,
  pickPhotos,
  type CapturedPhoto,
} from '@/utils/capturePhoto';
import { uploadProfilePhoto } from '@/services/member';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeProfilePhotoStyles } from '@/styles/profilePhoto.styles';
import type { AuthStackParamList } from '@/types';
import OnboardingScaffold from './OnboardingScaffold';

const ProfilePhotoScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeProfilePhotoStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const next = () => navigation.navigate('OnboardDone');

  const handleAsset = async (asset: CapturedPhoto | undefined) => {
    if (!asset?.base64) return;
    setPreview(asset.uri ?? null);
    setUploading(true);
    try {
      await uploadProfilePhoto({ base64: asset.base64, type: asset.type });
      Toast.show({ type: 'success', text1: 'Profile photo saved.' });
      next();
    } catch (e) {
      setPreview(null);
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : "Couldn't upload photo.",
      });
    } finally {
      setUploading(false);
    }
  };

  // Both go through the shared helpers so the OS prompt fires, and a blocked
  // permission offers Settings instead of dying with a toast.
  const takePhoto = async () => {
    const photo = await capturePhoto({ maxSize: 1024, cameraType: 'front' });
    if (photo) handleAsset(photo);
  };

  const pickFromLibrary = async () => {
    const [photo] = await pickPhotos({ maxSize: 1024 });
    if (photo) handleAsset(photo);
  };

  return (
    <OnboardingScaffold
      step={3}
      icon={
        <View style={styles.avatar}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={56} color={colors.textMuted} />
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={colors.secondary} />
          </View>
        </View>
      }
      title="Add a profile photo"
      subtitle="Helps your crew recognise you on chat and on the site."
      footer={
        <>
          <Button
            label="Take a photo"
            fullWidth
            loading={uploading}
            onPress={takePhoto}
          />
          <Button
            label="Upload from library"
            variant="outlined"
            color="secondary"
            fullWidth
            disabled={uploading}
            onPress={pickFromLibrary}
          />
          <TextLink label="Skip for now" onPress={next} />
        </>
      }
    />
  );
};

export default ProfilePhotoScreen;
