import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast, { type ToastConfig } from 'react-native-toast-message';

import { theme } from '@/theme';

export type TraydToastProps = {
  eyebrow?: string;
  onPress?: () => void;
};

export const toastConfig: ToastConfig = {
  trayd: ({ text1, text2, props }) => {
    const p = (props ?? {}) as TraydToastProps;
    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          Toast.hide();
          p.onPress?.();
        }}
      >
        <View style={styles.check}>
          <Ionicons name="checkmark" size={18} color={theme.colors.white} />
        </View>
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
  },
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
  check: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
