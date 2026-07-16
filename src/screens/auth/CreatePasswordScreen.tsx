import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BackButton, Button, Input } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { fetchMyMember } from '@/services/member';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/authSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeCreatePasswordStyles } from '@/styles/createPassword.styles';
import type { AuthStackParamList } from '@/types';

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8, required: true },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p), required: true },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p), required: true },
  { label: 'One symbol (recommended)', test: (p: string) => /[^A-Za-z0-9]/.test(p), required: false },
];

const STRENGTH_LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

const CreatePasswordScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeCreatePasswordStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'CreatePassword'>>();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const isOnboarding = params.mode === 'onboard';

  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  const results = RULES.map(rule => rule.test(password));
  const score = results.filter(Boolean).length;
  const canContinue = RULES.every((rule, i) => !rule.required || results[i]);

  const onSubmit = async () => {
    if (!canContinue) {
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setLoading(false);
      Toast.show({ type: 'error', text1: error.message });
      return;
    }

    if (isOnboarding) {
      // Activate membership (invited -> active) now that a password is set.
      const { error: acceptError } = await supabase.rpc('accept_team_invite');
      // Tolerate re-entry: a missing pending invite means it's already active.
      if (acceptError && !/no pending invite/i.test(acceptError.message)) {
        setLoading(false);
        Toast.show({ type: 'error', text1: acceptError.message });
        return;
      }

      // Sign in here rather than at the end of onboarding: the permission
      // priming screens now sit behind the logged-in gate, so every new and
      // returning user walks the same path into the app.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setLoading(false);
        Toast.show({ type: 'error', text1: 'Session expired. Please log in.' });
        navigation.navigate('Login');
        return;
      }
      const member = await fetchMyMember().catch(() => null);
      setLoading(false);
      dispatch(
        setCredentials({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          user: {
            id: data.session.user.id,
            email: member?.email ?? data.session.user.email ?? undefined,
            name: member?.fullName ?? undefined,
            photo: member?.photoPath ?? undefined,
          },
        }),
      );
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    Toast.show({ type: 'success', text1: 'Password updated. Please log in.' });
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
    >
      <BackButton absolute />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View style={styles.header}>
          <Image
            source={require('@assets/images/small_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Create your password</Text>
          <Text style={styles.subtitle}>
            {"You'll use this with "}
            <Text style={styles.subtitleStrong}>{params.email}</Text>
            {' to sign in.'}
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Password"
            placeholder="Enter a password"
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            rightIcon={show ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShow(s => !s)}
          />

          {password.length > 0 ? (
            <View style={styles.strengthBlock}>
              <View style={styles.strengthBar}>
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.strengthSegment,
                      {
                        backgroundColor:
                          i < score ? colors.primary : colors.borderMuted,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.strengthLabel}>{STRENGTH_LABELS[score]}</Text>
            </View>
          ) : null}

          <View style={styles.checklist}>
            {RULES.map((rule, i) => {
              const met = results[i];
              return (
                <View key={rule.label} style={styles.checkRow}>
                  <Ionicons
                    name={met ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={met ? colors.green : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.checkText,
                      { color: met ? colors.text : colors.textMuted },
                    ]}
                  >
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            fullWidth
            loading={loading}
            disabled={!canContinue}
            onPress={onSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreatePasswordScreen;
