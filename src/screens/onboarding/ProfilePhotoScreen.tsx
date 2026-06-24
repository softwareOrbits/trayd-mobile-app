import { useState } from 'react';
import { Image, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, TextLink } from '@/components/ui';
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

  const handleAsset = async (asset: Asset | undefined) => {
    if (!asset?.base64) {
      Toast.show({ type: 'error', text1: "Couldn't read that image." });
      return;
    }
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

  const takePhoto = async () => {
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
    handleAsset(res.assets?.[0]);
  };

  const pickFromLibrary = async () => {
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
    handleAsset(res.assets?.[0]);
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
