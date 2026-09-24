import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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

import { BackButton } from '@/components/ui';
import {
  OnbCTAs,
  OnbHeading,
  OnbTopMark,
  RuleCheck,
  StrengthMeter,
  useOnbStyles,
  ONB,
} from '@/components/onboarding';
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
  const onb = useOnbStyles();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'CreatePassword'>>();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const isOnboarding = params.mode === 'onboard';

  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

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
    <KeyboardAvoidingView style={onb.shell}>
      <BackButton absolute />
      <ScrollView
        style={onb.shell}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 2, paddingBottom: insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <OnbTopMark />
        <OnbHeading
          title="Create your password"
          sub={
            <>
              {"You'll use this with "}
              <Text style={onb.subStrong}>{params.email}</Text>
              {' to sign in.'}
            </>
          }
        />

        <View style={styles.form}>
          <View>
            <Text style={onb.fieldLabel}>Password</Text>
            <View style={onb.inputRow}>
              <TextInput
                style={[
                  onb.input,
                  onb.inputWithIcon,
                  focused && onb.inputFocused,
                ]}
                placeholder="Enter a password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <Pressable
                style={onb.inputIcon}
                onPress={() => setShow(v => !v)}
                hitSlop={8}
              >
                <Ionicons
                  name={show ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={ONB.muted}
                />
              </Pressable>
            </View>
          </View>

          {password.length > 0 ? (
            <StrengthMeter filled={score} label={STRENGTH_LABELS[score]} />
          ) : null}

          <View style={styles.checklist}>
            {RULES.map((rule, i) => (
              <RuleCheck key={rule.label} ok={results[i]} label={rule.label} />
            ))}
          </View>
        </View>

        <OnbCTAs
          primary="Continue"
          onPrimary={onSubmit}
          loading={loading}
          disabled={!canContinue}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreatePasswordScreen;
