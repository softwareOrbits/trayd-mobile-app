import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  Button,
  FilePreview,
  previewKindOf,
  useFilePreview,
} from '@/components/ui';
import { certDocumentUrl, daysToExpiry } from '@/services/certifications';
import { toastError } from '@/utils/toast';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDateFull } from '@/utils/datetime';
import { makeCertificationStyles } from '@/styles/certifications.styles';
import type { MainStackParamList } from '@/types';

const fmtDate = (iso: string | null) => fmtDateFull(iso) ?? '—';

const CertificationDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCertificationStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'CertificationDetail'>>();
  const { cert, holder } = params;
  const preview = useFilePreview();
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    if (!cert.documentPath) return undefined;
    let active = true;
    certDocumentUrl(cert.documentPath)
      .then(url => active && setDocUrl(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cert.documentPath]);

  const openDocument = async () => {
    if (!cert.documentPath || loadingDoc) return;
    const url = docUrl ?? (await resolveDoc());
    if (!url) return;
    preview.open([{ uri: url, label: cert.typeName }]);
  };

  const resolveDoc = async () => {
    setLoadingDoc(true);
    try {
      const url = await certDocumentUrl(cert.documentPath as string);
      setDocUrl(url);
      if (!url) toastError(new Error('That file could not be opened.'), '');
      return url;
    } catch (e) {
      toastError(e, 'Could not open that file.');
      return null;
    } finally {
      setLoadingDoc(false);
    }
  };

  const banner = () => {
    const d = daysToExpiry(cert.expiresOn);
    switch (cert.status) {
      case 'valid':
        return {
          bg: colors.surfaceMuted,
          color: colors.green,
          icon: 'checkmark-circle' as const,
          text: `Valid until ${fmtDate(cert.expiresOn)}`,
        };
      case 'expiring':
        return {
          bg: colors.surfaceMuted,
          color: colors.warning,
          icon: 'alert-circle' as const,
          text: `Expires in ${d} day${d === 1 ? '' : 's'} · ${fmtDate(
            cert.expiresOn,
          )}`,
        };
      case 'expired':
        return {
          bg: colors.errorBg,
          color: colors.error,
          icon: 'close-circle' as const,
          text: `Expired ${Math.abs(d ?? 0)} days ago. Contact your employer.`,
        };
      default:
        return {
          bg: colors.surfaceMuted,
          color: colors.textMuted,
          icon: 'information-circle' as const,
          text: 'No expiry date on file.',
        };
    }
  };

  const b = banner();
  const rows = [
    { label: 'HOLDER', value: holder || '—' },
    { label: 'CERT NUMBER', value: cert.certNumber ?? '—' },
    { label: 'ISSUING BODY', value: cert.issuingBody ?? '—' },
    { label: 'ISSUED', value: fmtDate(cert.issuedOn) },
    { label: 'EXPIRES', value: fmtDate(cert.expiresOn) },
  ];

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
          <Text style={styles.eyebrow}>MY CERTIFICATIONS</Text>
          <Text style={styles.title}>{cert.typeName}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.banner, { backgroundColor: b.bg }]}>
          <Ionicons name={b.icon} size={20} color={b.color} />
          <Text style={[styles.bannerText, { color: b.color }]}>{b.text}</Text>
        </View>

        <View style={styles.infoCard}>
          {rows.map((r, i) => (
            <View
              key={r.label}
              style={[
                styles.infoRow,
                i < rows.length - 1 && styles.infoDivider,
              ]}
            >
              <Text style={styles.infoLabel}>{r.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {r.value}
              </Text>
            </View>
          ))}
        </View>

        {cert.documentPath ? (
          <Pressable
            style={styles.docRow}
            onPress={openDocument}
            disabled={loadingDoc}
          >
            {docUrl && previewKindOf({ uri: docUrl }) === 'image' ? (
              <Image source={{ uri: docUrl }} style={styles.docThumb} />
            ) : (
              <View style={styles.docIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.secondary}
                />
              </View>
            )}
            <View style={styles.docBody}>
              <Text style={styles.docTitle}>Certificate file</Text>
              <Text style={styles.docHint}>
                {loadingDoc ? 'Opening…' : 'Tap to view'}
              </Text>
            </View>
            {loadingDoc ? (
              <ActivityIndicator size="small" color={colors.secondary} />
            ) : (
              <Ionicons name="expand" size={17} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}

        <View style={{ height: 20 }} />
        <Button
          label="Edit certificate"
          fullWidth
          onPress={() =>
            navigation.navigate('EditCertification', { cert, holder })
          }
        />

        <FilePreview {...preview.props} />
      </ScrollView>
    </View>
  );
};

export default CertificationDetailScreen;
