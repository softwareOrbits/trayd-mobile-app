import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button } from '@/components/ui';
import { daysToExpiry } from '@/services/certifications';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeCertificationStyles } from '@/styles/certifications.styles';
import type { MainStackParamList } from '@/types';

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const CertificationDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCertificationStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'CertificationDetail'>>();
  const { cert, holder } = params;

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

        <View style={{ height: 20 }} />
        <Button
          label="Edit certificate"
          fullWidth
          onPress={() =>
            navigation.navigate('EditCertification', { cert, holder })
          }
        />
      </ScrollView>
    </View>
  );
};

export default CertificationDetailScreen;
