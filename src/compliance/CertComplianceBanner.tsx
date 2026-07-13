import { Pressable, Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { daysToExpiry } from '@/services/certifications';
import type { CertBlocker } from '@/services/certCompliance';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeCertComplianceStyles } from '@/styles/certCompliance.styles';
import type { MainStackParamList } from '@/types';
import { useCertCompliance } from './CertComplianceProvider';

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    .toUpperCase();

const reasonLabel = (b: CertBlocker) => {
  if (b.reason === 'missing') return 'NOT ADDED';
  if (b.reason === 'no_document') return 'NO DOCUMENT';
  return b.expiresOn ? `EXPIRED ${shortDate(b.expiresOn)}` : 'EXPIRED';
};

const expiryLabel = (expiresOn: string | null) => {
  const days = daysToExpiry(expiresOn);
  if (days == null) return 'EXPIRING';
  if (days <= 0) return 'EXPIRED';
  return days === 1 ? '1 DAY LEFT' : `${days} DAYS LEFT`;
};

type Row = { key: string; name: string; label: string };

export const CertComplianceBanner = ({ style }: { style?: ViewStyle }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCertComplianceStyles);
  const { compliance } = useCertCompliance();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { blockers, expiringSoon } = compliance;
  if (!blockers.length && !expiringSoon.length) return null;

  const blocking = blockers.length > 0;
  const accent = blocking ? colors.error : colors.warning;
  const bg = blocking ? colors.errorBg : colors.warningBg;

  const rows: Row[] = blocking
    ? blockers.map(b => ({
        key: b.typeId,
        name: titleCase(b.typeName),
        label: reasonLabel(b),
      }))
    : expiringSoon.map(c => ({
        key: c.typeId,
        name: titleCase(c.typeName),
        label: expiryLabel(c.expiresOn),
      }));

  return (
    <Pressable
      onPress={() => navigation.navigate('Certifications')}
      style={[styles.card, { backgroundColor: bg, borderColor: accent }, style]}
    >
      <View style={styles.head}>
        <Ionicons
          name={blocking ? 'alert-circle' : 'warning'}
          size={20}
          color={accent}
        />
        <View style={styles.headText}>
          <Text style={[styles.title, { color: accent }]}>
            {blocking
              ? 'You can’t start a job yet'
              : 'Certification expiring soon'}
          </Text>
          <Text style={styles.subtitle}>
            {blocking
              ? 'Your employer needs these before you go on the clock.'
              : 'Renew these to stay on the clock.'}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {rows.map(row => (
          <View key={row.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={styles.itemName} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.itemReason, { color: accent }]}>
              {row.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.cta}>
        <Text style={[styles.ctaText, { color: accent }]}>
          {blocking ? 'Sort it out' : 'Renew now'}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={accent} />
      </View>
    </Pressable>
  );
};

export default CertComplianceBanner;
