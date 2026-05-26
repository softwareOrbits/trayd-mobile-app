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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';
import { linkTextStyles, subtitleStyles, titleStyles } from '@/theme/constants';

const CODE_LENGTH = 6;
const SCREEN_PADDING = 24;
const BOX_GAP = 8;
const BOX_WIDTH = 46;
const OTP_WIDTH = (BOX_WIDTH + BOX_GAP) * CODE_LENGTH;

const InviteCodeScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [code, setCode] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require('@assets/images/small_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Got an invite code?</Text>
          <Text style={styles.subtitle}>
            {'Your employer sent you a 6-character code to '}
            <Text style={styles.subtitleStrong}>join their crew</Text>
            {' on Trayd.'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.otpWrap}>
            <OtpInput
              numberOfDigits={CODE_LENGTH}
              type="alphanumeric"
              onTextChange={setCode}
              focusColor={colors.secondary}
              textInputProps={{ autoCapitalize: 'characters' }}
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
                text1: 'Ask your employer for your invite code.',
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
            disabled={code.length < CODE_LENGTH}
            onPress={() =>
              navigation.navigate('ConfirmInvite', { code: code.toUpperCase() })
            }
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

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: SCREEN_PADDING },
    header: { alignItems: 'center', marginTop: 12 },
    logo: { width: 86, height: 63, marginBottom: 16 },
    title: titleStyles,
    subtitle: subtitleStyles,
    subtitleStrong: { fontFamily: theme.fonts.bold, color: theme.colors.primary },
    form: { marginTop: 28 },
    otpWrap: { width: '100%', alignItems: 'center' },
    otpContainer: {
      width: OTP_WIDTH,
      alignSelf: 'center',
    },
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
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.monoBold,
      textAlign: 'center',
      includeFontPadding: false,
    },
    helpLink: { marginTop: 16, alignSelf: 'center' },
    helpText: linkTextStyles,
    footer: { marginTop: 'auto', gap: 18, alignItems: 'center' },
    laterLink: { paddingVertical: 4 },
    laterText: linkTextStyles,
  });

export default InviteCodeScreen;
