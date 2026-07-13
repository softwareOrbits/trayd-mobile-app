import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button } from '@/components/ui';
import {
  daysToExpiry,
  fetchMyCertifications,
  type CertStatus,
  type MemberCertification,
} from '@/services/certifications';
import { fetchMyMember } from '@/services/member';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeCertificationStyles } from '@/styles/certifications.styles';
import type { MainStackParamList } from '@/types';

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const relExpiry = (iso: string) => {
  const d = daysToExpiry(iso);
  if (d == null) return '';
  if (d < 0) return `${Math.abs(d)} days ago`;
  if (d === 0) return 'today';
  return `in ${d} days`;
};

const CertificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCertificationStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [certs, setCerts] = useState<MemberCertification[]>([]);
  const [holder, setHolder] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      fetchMyCertifications()
        .then(c => active && setCerts(c))
        .catch(() => active && setCerts([]))
        .finally(() => active && setLoading(false));
      fetchMyMember()
        .then(m => {
          if (!active) return;
          setHolder(m.fullName ?? 'You');
          setRole(m.roleName ?? '');
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const badgeFor = (status: CertStatus) => {
    switch (status) {
      case 'valid':
        return { label: 'VALID', color: colors.green };
      case 'expiring':
        return { label: 'EXPIRING', color: colors.warning };
      case 'expired':
        return { label: 'EXPIRED', color: colors.error };
      default:
        return { label: 'NO EXPIRY', color: colors.textMuted };
    }
  };

  const expired = certs.filter(c => c.status === 'expired');

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
          <Text style={styles.title}>My Certifications</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            {[holder, role].filter(Boolean).join(' · ')}
            {holder ? ' — ' : ''}show this screen on site when asked.
          </Text>

          <View style={{ height: 16 }} />

          {certs.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="ribbon-outline"
                  size={28}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>No certifications added</Text>
              <Text style={styles.emptyText}>
                Add your Safe Pass, CSCS and trade licence. They’ll show here so
                you can present them on-site.
              </Text>
              <Button
                label="Add a certification"
                leftIcon="add"
                fullWidth
                onPress={() => navigation.navigate('AddCertification')}
              />
            </View>
          ) : (
            <>
              {certs.map(c => {
                const badge = badgeFor(c.status);
                return (
                  <Pressable
                    key={c.id}
                    style={styles.card}
                    onPress={() =>
                      navigation.navigate('CertificationDetail', {
                        cert: c,
                        holder,
                      })
                    }
                  >
                    <View style={styles.cardHead}>
                      <Text style={styles.cardType}>{c.typeName}</Text>
                      <View style={styles.badge}>
                        <Text style={[styles.badgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {[c.issuingBody, c.certNumber].filter(Boolean).join(' · ') ||
                        '—'}
                    </Text>
                    <Text style={styles.cardExpiry}>
                      {c.expiresOn ? (
                        <>
                          EXPIRES{' '}
                          <Text style={styles.cardExpiryStrong}>
                            {fmtDate(c.expiresOn)}
                          </Text>
                          {` · ${relExpiry(c.expiresOn)}`}
                        </>
                      ) : (
                        'No expiry date'
                      )}
                    </Text>
                    <View style={styles.cardFoot}>
                      <Text style={styles.viewLink}>View certificate ›</Text>
                    </View>
                  </Pressable>
                );
              })}

              <View style={styles.addBtn}>
                <Button
                  label="Add a certification"
                  leftIcon="add"
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onPress={() => navigation.navigate('AddCertification')}
                />
              </View>

              {expired.length > 0 ? (
                <View style={styles.warnBox}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={colors.error}
                  />
                  <Text style={styles.warnText}>
                    <Text style={styles.warnStrong}>
                      Your {expired[0].typeName} has expired.{' '}
                    </Text>
                    Your office has been alerted. You can’t be assigned site work
                    until it’s renewed.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default CertificationsScreen;
