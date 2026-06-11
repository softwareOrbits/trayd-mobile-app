import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OtpInput } from 'react-native-otp-entry';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BackButton, Button } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';
import type { AuthStackParamList } from '@/types';

const CODE_LENGTH = 8;
const SCREEN_PADDING = 24;
const BOX_GAP = 4;
const BOX_WIDTH = 36;
const OTP_WIDTH = (BOX_WIDTH + BOX_GAP) * CODE_LENGTH;

const VerifyIdentityScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { params } = useRoute<RouteProp<AuthStackParamList, 'VerifyIdentity'>>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: params.email,
      token: code,
      type: 'recovery',
    });
    setLoading(false);
    if (error) {
      Toast.show({ type: 'error', text1: error.message });
      return;
    }
    navigation.navigate('CreatePassword', {
      email: params.email,
      mode: 'reset',
    });
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
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Enter the 8-digit verification code sent to your email.
          </Text>
        </View>

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
                text1: 'Check the verification email we sent you.',
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
            label="Verify and continue"
            fullWidth
            loading={loading}
            disabled={code.length < CODE_LENGTH}
            onPress={onVerify}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 56, height: 44, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    form: { marginTop: 28 },
    otpWrap: { width: '100%', alignItems: 'center' },
    otpContainer: { width: OTP_WIDTH, alignSelf: 'center' },
    otpBox: {
      width: BOX_WIDTH,
      height: 56,
      marginHorizontal: BOX_GAP / 2,
      flexGrow: 0,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.inputBackground,
    },
    otpBoxFocused: { borderColor: theme.colors.secondary },
    otpText: {
      color: theme.colors.text,
      fontSize: theme.typography.size.xl,
      fontFamily: theme.fonts.monoBold,
      textAlign: 'center',
      includeFontPadding: false,
    },
    helpLink: { marginTop: 16, alignSelf: 'center' },
    helpText: linkTextStyles,
    footer: { marginTop: 'auto' },
  });

export default VerifyIdentityScreen;
