import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast, {
  type ToastConfig,
  type ToastConfigParams,
} from 'react-native-toast-message';

import { theme } from '@/theme';
import { haptics } from '@/utils/haptics';

export type TraydToastProps = {
  eyebrow?: string;
  onPress?: () => void;
};

const useHapticOnShow = (isVisible: boolean, fire: () => void) => {
  const shown = useRef(false);
  useEffect(() => {
    if (isVisible && !shown.current) {
      shown.current = true;
      fire();
    } else if (!isVisible) {
      shown.current = false;
    }
  }, [isVisible, fire]);
};

const TraydToast = ({
  text1,
  text2,
  props,
  isVisible,
}: ToastConfigParams<TraydToastProps>) => {
  useHapticOnShow(isVisible, haptics.success);
  const p = (props ?? {}) as TraydToastProps;
  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        Toast.hide();
        p.onPress?.();
      }}
    >
      <Image
        source={require('@assets/images/small_logo.png')}
        style={styles.cardLogo}
        resizeMode="contain"
      />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>{p.eyebrow ?? 'TRAYD'}</Text>
          <Text style={styles.now}>NOW</Text>
        </View>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.link}>{text2} ›</Text> : null}
      </View>
    </Pressable>
  );
};

const SuccessToast = ({
  text1,
  text2,
  isVisible,
}: ToastConfigParams<unknown>) => {
  useHapticOnShow(isVisible, haptics.success);
  return (
    <View style={styles.pill}>
      <Image
        source={require('@assets/images/small_logo.png')}
        style={styles.pillLogo}
        resizeMode="contain"
      />
      <View style={styles.pillBody}>
        {text1 ? (
          <Text style={styles.pillTitle} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={styles.pillSub} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const ErrorToast = ({ text1, text2, isVisible }: ToastConfigParams<unknown>) => {
  useHapticOnShow(isVisible, haptics.error);
  return (
    <View style={[styles.pill, styles.pillError]}>
      <Ionicons
        name="alert-circle"
        size={22}
        color={theme.colors.error}
        style={styles.pillIcon}
      />
      <View style={styles.pillBody}>
        {text1 ? (
          <Text style={styles.pillTitle} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={styles.pillSub} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const toastConfig: ToastConfig = {
  trayd: params => <TraydToast {...params} />,
  success: params => <SuccessToast {...params} />,
  error: params => <ErrorToast {...params} />,
};

const styles = StyleSheet.create({
  card: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.creamBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardLogo: { width: 34, height: 34, borderRadius: 8 },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: theme.fonts.monoBold,
    letterSpacing: 1,
    color: theme.colors.textMuted,
  },
  now: {
    fontSize: 9,
    fontFamily: theme.fonts.mono,
    letterSpacing: 0.6,
    color: theme.colors.textMuted,
  },
  title: {
    marginTop: 2,
    fontSize: theme.typography.size.md,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
  },
  link: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: theme.fonts.monoBold,
    letterSpacing: 0.8,
    color: theme.colors.primary,
  },
  pill: {
    alignSelf: 'center',
    maxWidth: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.creamBorder,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pillError: { borderColor: theme.colors.errorBg },
  pillLogo: { width: 26, height: 26, borderRadius: 6 },
  pillIcon: { width: 26, textAlign: 'center' },
  pillBody: { flexShrink: 1, gap: 2 },
  pillTitle: {
    fontSize: theme.typography.size.sm,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
  },
  pillSub: {
    fontSize: theme.typography.size.xs,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textMuted,
  },
});
