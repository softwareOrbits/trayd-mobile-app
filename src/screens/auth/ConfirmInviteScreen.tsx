import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, Banner, Button } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { fetchMyMember, type MemberProfile } from '@/services/member';
import { useTheme } from '@/theme';
import { makeConfirmInviteStyles } from '@/styles/confirmInvite.styles';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';

const firstName = (fullName: string | null) =>
  fullName?.trim().split(/\s+/)[0] ?? 'there';

const ConfirmInviteScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeConfirmInviteStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdult, setIsAdult] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyMember()
      .then(m => {
        console.log('[invite] fetched member info:', m);
        if (active) setMember(m);
      })
      .catch(e => {
        console.log('[invite] fetchMyMember error:', e?.message ?? e);
        if (active) setError(e?.message ?? 'Something went wrong.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const signOutToLogin = async () => {
    await supabase.auth.signOut();
    navigation.navigate('Login');
  };

  if (loading) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  const rows = member
    ? [
        { label: 'Name', value: member.fullName ?? '—' },
        { label: 'Role', value: member.roleName ?? '—' },
        { label: 'Company', value: member.companyName ?? '—' },
        { label: 'Email', value: member.email ?? '—' },
      ]
    : [];

  return (
    <View style={styles.flex}>
      <BackButton absolute />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require('@assets/images/small_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>
            Welcome to Trayd, {firstName(member?.fullName ?? null)}
          </Text>
          {member?.companyName ? (
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleStrong}>{member.companyName}</Text>
              {' has invited you to join their crew.'}
            </Text>
          ) : null}
        </View>

        {error ? (
          <Banner
            variant="error"
            title="We couldn't load your invite"
            message={error}
            style={styles.banner}
          />
        ) : (
          <View style={styles.card}>
            {rows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.row,
                  index < rows.length - 1 ? styles.rowDivider : null,
                ]}
              >
                <Text style={styles.rowLabel}>{row.label.toUpperCase()}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {member && !error ? (
          <Pressable
            style={styles.consentRow}
            onPress={() => setIsAdult(v => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isAdult }}
            accessibilityLabel="I confirm I am 18 years of age or older"
          >
            <View
              style={[
                styles.consentBox,
                isAdult ? styles.consentBoxOn : styles.consentBoxOff,
              ]}
            >
              {isAdult ? (
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={colors.onPrimary}
                />
              ) : null}
            </View>
            <Text style={styles.consentText}>
              I confirm I am 18 years of age or older.
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          {member && !error ? (
            <Button
              label="That's me"
              fullWidth
              disabled={!isAdult}
              onPress={() =>
                navigation.navigate('CreatePassword', {
                  email: member.email ?? '',
                  mode: 'onboard',
                })
              }
            />
          ) : null}
          <Pressable
            onPress={signOutToLogin}
            style={styles.signoutLink}
            hitSlop={8}
          >
            <Text style={styles.signoutText}>
              {error ? 'Back to sign in' : 'Not me — sign out'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default ConfirmInviteScreen;
