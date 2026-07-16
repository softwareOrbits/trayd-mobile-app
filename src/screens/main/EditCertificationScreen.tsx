import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, CalendarModal, Input } from '@/components/ui';
import {
  fetchCertificationTypes,
  updateCertification,
  uploadCertDocument,
  statusOf,
  type CertificationType,
  type MemberCertification,
} from '@/services/certifications';
import { offlineActionBlocked } from '@/offline';
import { useCertCompliance } from '@/compliance';
import { acquirePhotos } from '@/utils/capturePhoto';
import { toastError } from '@/utils/toast';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeCertificationStyles } from '@/styles/certifications.styles';
import type { MainStackParamList } from '@/types';

const fmtDisplay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const EditCertificationScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCertificationStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'EditCertification'>>();
  const { cert, holder } = params;

  const [types, setTypes] = useState<CertificationType[]>([]);
  const [typeSheet, setTypeSheet] = useState(false);
  const [selected, setSelected] = useState<CertificationType | null>(
    cert.typeId
      ? {
          id: cert.typeId,
          name: cert.typeName,
          issuingBody: cert.issuingBody,
          isMandatory: false,
        }
      : null,
  );
  const [number, setNumber] = useState(cert.certNumber ?? '');
  const [issued, setIssued] = useState(cert.issuedOn ?? '');
  const [expires, setExpires] = useState(cert.expiresOn ?? '');
  const [photoPath, setPhotoPath] = useState<string | null>(cert.documentPath);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [datePicker, setDatePicker] = useState<'issue' | 'expiry' | null>(null);
  const [saving, setSaving] = useState(false);
  const { refresh: refreshCompliance } = useCertCompliance();

  const addPhoto = async () => {
    const [photo] = await acquirePhotos({ selectionLimit: 1 });
    if (!photo) return;
    setPhotoUploading(true);
    try {
      const path = await uploadCertDocument({
        base64: photo.base64,
        type: photo.type,
      });
      setPhotoPath(path);
    } catch (e) {
      toastError(e, 'Could not upload the photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchCertificationTypes()
      .then(t => active && setTypes(t))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (saving) return;
    if (!selected) {
      Toast.show({ type: 'error', text1: 'Pick a certification type first.' });
      return;
    }
    if (number.trim().length === 0) {
      Toast.show({ type: 'error', text1: 'Enter the certificate number.' });
      return;
    }
    if (offlineActionBlocked()) {
      Toast.show({ type: 'error', text1: 'Blocked — you appear offline.' });
      return;
    }
    setSaving(true);
    try {
      await updateCertification({
        id: cert.id,
        certificationTypeId: selected.id,
        certNumber: number.trim(),
        issuedOn: issued || null,
        expiresOn: expires || null,
        documentPath: photoPath,
      });
      await refreshCompliance();
      Toast.show({ type: 'success', text1: 'Certification updated.' });
      const updated: MemberCertification = {
        ...cert,
        typeId: selected.id,
        typeName: selected.name,
        issuingBody: selected.issuingBody,
        certNumber: number.trim() || null,
        issuedOn: issued || null,
        expiresOn: expires || null,
        documentPath: photoPath,
        status: statusOf(expires || null),
      };
      navigation.navigate('CertificationDetail', { cert: updated, holder });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Could not save',
        text2: e instanceof Error ? e.message : String(e),
        visibilityTime: 6000,
      });
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PROFILE · COMPLIANCE</Text>
          <Text style={styles.title}>Edit certification</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.fieldLabel}>
          CERTIFICATION TYPE <Text style={styles.req}>· REQUIRED</Text>
        </Text>
        <Pressable style={styles.select} onPress={() => setTypeSheet(true)}>
          <Text
            style={[styles.selectText, !selected && styles.selectPlaceholder]}
          >
            {selected ? selected.name : 'Choose a type'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={{ height: 18 }} />
        <Text style={styles.fieldLabel}>
          CERTIFICATE NUMBER <Text style={styles.req}>· REQUIRED</Text>
        </Text>
        <Input
          value={number}
          onChangeText={setNumber}
          placeholder="e.g. SP-08314-2025"
          autoCapitalize="characters"
        />

        <View style={{ height: 18 }} />
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>ISSUE DATE</Text>
            <Pressable
              style={styles.select}
              onPress={() => setDatePicker('issue')}
            >
              <Text
                style={[styles.selectText, !issued && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {issued ? fmtDisplay(issued) : 'Select date'}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
            <Pressable
              style={styles.select}
              onPress={() => setDatePicker('expiry')}
            >
              <Text
                style={[styles.selectText, !expires && styles.selectPlaceholder]}
                numberOfLines={1}
              >
                {expires ? fmtDisplay(expires) : 'Select date'}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={{ height: 18 }} />
        <Text style={styles.fieldLabel}>
          PHOTO OF THE CARD{' '}
          <Text style={{ color: colors.textMuted }}>· OPTIONAL</Text>
        </Text>
        <Pressable
          style={styles.photoTile}
          onPress={addPhoto}
          disabled={photoUploading}
        >
          {photoUploading ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Ionicons
              name={photoPath ? 'checkmark-circle' : 'camera-outline'}
              size={22}
              color={photoPath ? colors.primary : colors.textMuted}
            />
          )}
          <Text style={styles.photoTileText}>
            {photoUploading
              ? 'Uploading…'
              : photoPath
              ? 'Card photo attached — tap to replace'
              : 'Take a photo or upload'}
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />
        <Button
          label="Save changes"
          fullWidth
          loading={saving}
          disabled={saving}
          onPress={save}
        />
      </ScrollView>

      <Modal
        visible={typeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeSheet(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setTypeSheet(false)}
        >
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            {types.length === 0 ? (
              <View style={styles.sheetRow}>
                <Text style={styles.sheetRowText}>No types available</Text>
              </View>
            ) : (
              types.map(t => (
                <Pressable
                  key={t.id}
                  style={styles.sheetRow}
                  onPress={() => {
                    setSelected(t);
                    setTypeSheet(false);
                  }}
                >
                  <Text style={styles.sheetRowText}>{t.name}</Text>
                </Pressable>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <CalendarModal
        visible={datePicker === 'issue'}
        value={issued || null}
        title="Issue date"
        onSelect={setIssued}
        onClose={() => setDatePicker(null)}
      />
      <CalendarModal
        visible={datePicker === 'expiry'}
        value={expires || null}
        title="Expiry date"
        onSelect={setExpires}
        onClose={() => setDatePicker(null)}
      />
    </View>
  );
};

export default EditCertificationScreen;
