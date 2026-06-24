import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpInput } from 'react-native-otp-entry';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BackButton, Banner, Button } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';
import { makeInviteCodeStyles } from '@/styles/inviteCode.styles';

const CODE_LENGTH = 8;

// Maps resolve-employee-invite error codes to friendly copy.
const errorTextFor = (code: string) => {
  switch (code) {
    case 'expired':
      return 'That code has expired. Ask your employer to resend the invite.';
    case 'too_many_attempts':
      return 'Too many attempts. Please wait a minute and try again.';
    default:
      return "That code doesn't match an invite. Double-check it and try again.";
  }
};

const InviteCodeScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeInviteCodeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const onSubmit = async () => {
    setErrorText(null);
    setLoading(true);

    // 1. Resolve the code to the email it was issued to.
    const { data, error } = await supabase.functions.invoke(
      'resolve-employee-invite',
      { body: { otp: code } },
    );
    if (error) {
      let serverCode = '';
      try {
        const body = await (error as { context?: Response }).context?.json();
        serverCode = body?.error ?? '';
      } catch {
        // fall through to the generic message
      }
      setLoading(false);
      setErrorText(errorTextFor(serverCode));
      return;
    }

    const email: string | undefined = data?.email;
    console.log('[invite] resolved email from code:', email, '| raw:', data);
    if (!email) {
      setLoading(false);
      setErrorText(errorTextFor(''));
      return;
    }

    // 2. Verify the OTP natively to establish a session.
    const { data: verifyData, error: verifyError } =
      await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'invite',
      });
    console.log(
      '[invite] verifyOtp →',
      verifyError ? `error: ${verifyError.message}` : 'session established',
      '| userId:',
      verifyData?.user?.id,
    );
    setLoading(false);
    if (verifyError) {
      setErrorText(
        /expired/i.test(verifyError.message)
          ? 'That code has expired. Ask your employer to resend the invite.'
          : "We couldn't verify that code. Please try again.",
      );
      return;
    }

    navigation.navigate('ConfirmInvite');
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
          <Text style={styles.title}>Got an invite code?</Text>
          <Text style={styles.subtitle}>
            {'Your employer sent you an 8-digit code to '}
            <Text style={styles.subtitleStrong}>join their crew</Text>
            {' on Trayd.'}
          </Text>
        </View>

        {errorText ? (
          <Banner
            variant="error"
            title="Couldn't verify your invite"
            message={errorText}
            onDismiss={() => setErrorText(null)}
            style={styles.banner}
          />
        ) : null}

        <View style={styles.form}>
          <View style={styles.otpWrap}>
            <OtpInput
              numberOfDigits={CODE_LENGTH}
              onTextChange={setCode}
              focusColor={colors.secondary}
              theme={{
                containerStyle: styles.otpContainer,
                pinCodeContainerStyle: styles.otpBox,
                pinCodeTextStyle: styles.otpText,
                focusedPinCodeContainerStyle: styles.otpBoxFocused,
              }}
            />
          </View>
          <Pressable
            onPress={() =>
              Toast.show({
                type: 'info',
                text1: 'Check the invite email your employer sent you.',
              })
            }
            style={styles.helpLink}
            hitSlop={8}
          >
            <Text style={styles.helpText}>Where do I find this?</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button
            label="Continue"
            fullWidth
            loading={loading}
            disabled={code.length < CODE_LENGTH}
            onPress={onSubmit}
          />
          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={styles.laterLink}
            hitSlop={8}
          >
            <Text style={styles.laterText}>{"I'll do this later"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default InviteCodeScreen;
