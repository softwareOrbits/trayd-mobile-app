import { Fragment, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BackButton, Banner } from '@/components/ui';
import {
  IdentRow,
  OnbCTAs,
  OnbDivider,
  OnbHeading,
  OnbTopMark,
  useOnbStyles,
  ONB,
} from '@/components/onboarding';
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
  const onb = useOnbStyles();
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
        if (active) setMember(m);
      })
      .catch(e => {
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
      <View style={[onb.shell, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  const rows = member
    ? [
        { label: 'Name', value: member.fullName ?? '—', mono: false },
        { label: 'Role', value: member.roleName ?? '—', mono: false },
        { label: 'Company', value: member.companyName ?? '—', mono: true },
        { label: 'Email', value: member.email ?? '—', mono: true },
      ]
    : [];

  return (
    <View style={onb.shell}>
      <BackButton absolute />
      <ScrollView
        style={onb.shell}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 2, paddingBottom: insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <OnbTopMark />
        <OnbHeading
          title={`Welcome to Trayd, ${firstName(member?.fullName ?? null)}`}
          sub={
            member?.companyName ? (
              <>
                <Text style={onb.subStrong}>{member.companyName}</Text>
                {' has invited you to join their crew.'}
              </>
            ) : undefined
          }
        />

        {error ? (
          <Banner
            variant="error"
            title="We couldn't load your invite"
            message={error}
            style={onb.banner}
          />
        ) : (
          <View style={styles.cardWrap}>
            <View style={onb.card}>
              {rows.map((row, index) => (
                <Fragment key={row.label}>
                  {index > 0 ? <OnbDivider /> : null}
                  <IdentRow
                    label={row.label}
                    value={row.value}
                    mono={row.mono}
                  />
                </Fragment>
              ))}
            </View>
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
                <Ionicons name="checkmark" size={14} color={ONB.navy} />
              ) : null}
            </View>
            <Text style={styles.consentText}>
              I confirm I am 18 years of age or older.
            </Text>
          </Pressable>
        ) : null}

        {member && !error ? (
          <OnbCTAs
            primary="That's me"
            disabled={!isAdult}
            onPrimary={() =>
              navigation.navigate('CreatePassword', {
                email: member.email ?? '',
                mode: 'onboard',
              })
            }
            secondary="Not me — sign out"
            onSecondary={signOutToLogin}
          />
        ) : (
          <OnbCTAs primary="Back to sign in" onPrimary={signOutToLogin} />
        )}
      </ScrollView>
    </View>
  );
};

export default ConfirmInviteScreen;
