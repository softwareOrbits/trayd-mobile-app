import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Button, Input } from '@/components/ui';
import { updatePassword } from '@/services/member';
import { makeChangePasswordStyles } from '@/styles/changePassword.styles';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { MainStackParamList } from '@/types';

const ChangePasswordScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeChangePasswordStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 && next.length >= 8 && confirm === next && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await updatePassword(current, next);
      Toast.show({ type: 'success', text1: 'Password updated.' });
      navigation.goBack();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not update password.',
      });
      setSaving(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    error?: string,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <Input
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          placeholder="••••••••"
          error={error}
        />
        <Pressable
          onPress={() => setShow(s => !s)}
          hitSlop={8}
          style={styles.showBtn}
        >
          <Text style={styles.showText}>{show ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.secondary} />
        </Pressable>
        <Text style={styles.topTitle}>Change password</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Pick something at least 8 characters long. You’ll be logged out
          everywhere else.
        </Text>
        {field('Current password', current, setCurrent)}
        {field(
          'New password',
          next,
          setNext,
          tooShort ? 'At least 8 characters' : undefined,
        )}
        {field(
          'Confirm new password',
          confirm,
          setConfirm,
          mismatch ? 'Passwords don’t match' : undefined,
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Update password"
          fullWidth
          loading={saving}
          disabled={!canSubmit}
          onPress={submit}
        />
      </View>
      <AppToast />
    </KeyboardAvoidingView>
  );
};

export default ChangePasswordScreen;
