import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
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
import { Banner, Button, Input } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { AuthStackParamList } from '@/types';
import { makeLoginStyles } from '@/styles/login.styles';

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
  const [banner, setBanner] = useState<{
    variant: 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setBanner(null);
    try {
      await dispatch(signInWithPassword(data)).unwrap();
    } catch (err) {
      if (err === ACCOUNT_SUSPENDED) {
        setBanner({
          variant: 'warning',
          title: 'Account Suspended',
          message:
            'Your employee account has been suspended. Please contact your organization administrator for assistance.',
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
    >
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to your employee workspace.
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Email"
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

          <Pressable
            onPress={() => navigation.navigate('ResetPassword')}
            style={styles.forgotRow}
            hitSlop={8}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button
            label="Log In"
            fullWidth
            loading={loading}
            onPress={handleSubmit(onSubmit)}
          />
          <Pressable
            onPress={() => navigation.navigate('InviteCode')}
            style={styles.joinButton}
            hitSlop={8}
          >
            <Text style={styles.joinText}>Join Organization</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
