import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useAppDispatch } from '@/store/hooks';
import { ACCOUNT_SUSPENDED, signInWithPassword } from '@/store/authSlice';
import { setKeepSignedIn } from '@/services/authPrefs';
import { Banner, Button, Input } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError } from '@/utils/toast';
import type { AuthStackParamList } from '@/types';
import { makeLoginStyles } from '@/styles/login.styles';

const SIGNUP_URL = 'https://app.trayd.ie/signup';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(6, 'Min. 6 characters'),
});

type LoginForm = z.infer<typeof schema>;

const LoginScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLoginStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedInState] = useState(true);
  const [banner, setBanner] = useState<{
    variant: 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setBanner(null);
    try {
      await setKeepSignedIn(keepSignedIn);
      await dispatch(signInWithPassword(data)).unwrap();
    } catch (err) {
      if (err === ACCOUNT_SUSPENDED) {
        setBanner({
          variant: 'warning',
          title: 'Account Suspended',
          message:
            'Your account has been suspended. Get in touch with your company’s admin to sort it out.',
        });
      } else {
        setBanner({
          variant: 'error',
          title: 'Incorrect email or password',
          message:
            "We couldn't sign you in. Please check your email and password and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const openSignup = () => {
    Linking.openURL(SIGNUP_URL).catch(() =>
      toastError(new Error('Could not open the sign-up page.'), ''),
    );
  };

  return (
    <KeyboardAvoidingView style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {banner ? (
          <Banner
            variant={banner.variant}
            title={banner.title}
            message={banner.message}
            onDismiss={() => setBanner(null)}
            style={styles.banner}
          />
        ) : null}

        <View style={styles.header}>
          <Image
            source={require('@assets/images/small_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your Trayd workspace.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Email"
                labelStyle={styles.fieldLabel}
                style={styles.input}
                leftIcon="mail-outline"
                focusHighlight
                placeholder="name@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Password"
                labelStyle={styles.fieldLabel}
                style={styles.input}
                leftIcon="lock-closed-outline"
                focusHighlight
                placeholder="Min. 6 characters"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(s => !s)}
                error={errors.password?.message}
              />
            )}
          />

          <View style={styles.row}>
            <Pressable
              style={styles.remember}
              onPress={() => setKeepSignedInState(v => !v)}
              hitSlop={8}
            >
              <View
                style={[
                  styles.checkbox,
                  !keepSignedIn && styles.checkboxOff,
                ]}
              >
                {keepSignedIn ? (
                  <Ionicons name="checkmark" size={13} color={colors.white} />
                ) : null}
              </View>
              <Text style={styles.rememberText}>Keep me signed in</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('ResetPassword')}
              hitSlop={8}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Log In"
            rightIcon="arrow-forward"
            fullWidth
            loading={loading}
            style={styles.primary}
            onPress={handleSubmit(onSubmit)}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEW TO TRAYD?</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.tiles}>
            <Pressable style={styles.tile} onPress={openSignup}>
              <View style={styles.tileIcon}>
                <Ionicons name="business-outline" size={18} color={colors.white} />
              </View>
              <Text style={styles.tileTitle}>I run a business</Text>
              <Text style={styles.tileText}>
                Set up your team · 30 days free
              </Text>
              <View style={styles.tileGo}>
                <Text style={styles.tileGoText}>Sign up</Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.secondary}
                />
              </View>
            </Pressable>

            <Pressable
              style={styles.tile}
              onPress={() => navigation.navigate('InviteCode')}
            >
              <View style={[styles.tileIcon, styles.tileIconTeam]}>
                <Ionicons name="person-outline" size={18} color="#3D6E55" />
              </View>
              <Text style={styles.tileTitle}>I’m an employee</Text>
              <Text style={styles.tileText}>
                Enter the code your boss sent you
              </Text>
              <View style={styles.tileGo}>
                <Text style={[styles.tileGoText, styles.tileGoTextTeam]}>
                  Join
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#3D6E55" />
              </View>
            </Pressable>
          </View>

          <Text style={styles.fine}>BUILT IN IRELAND · CANCEL ANYTIME</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
