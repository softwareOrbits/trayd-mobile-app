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
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { BackButton, Button } from '@/components/ui';
import { supabase } from '@/services/supabase';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeVerifyIdentityStyles } from '@/styles/verifyIdentity.styles';
import type { AuthStackParamList } from '@/types';

const CODE_LENGTH = 8;

const VerifyIdentityScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeVerifyIdentityStyles);
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

export default VerifyIdentityScreen;
