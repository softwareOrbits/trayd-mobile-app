import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type WizardScaffoldProps = {
  step: number;
  total: number;
  title: string;
  subtitle?: ReactNode;
  onBack: () => void;
  onCancel: () => void;
  footer?: ReactNode;
  children: ReactNode;
  flowLabel?: string;
  cancelLabel?: string;
};

export const WizardScaffold = ({
  step,
  total,
  title,
  subtitle,
  onBack,
  onCancel,
  footer,
  children,
  flowLabel = 'Start a job',
  cancelLabel = 'Cancel',
}: WizardScaffoldProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.secondary} />
        </Pressable>
        <Text style={styles.stepLabel}>
          {`${flowLabel} · ${step} of ${total}`}
        </Text>
        <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{cancelLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.segments}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.segment, i < step ? styles.segmentOn : styles.segmentOff]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </ScrollView>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingBottom: 10,
      gap: 6,
    },
    iconBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepLabel: {
      flex: 1,
      textAlign: 'center',
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    cancelBtn: { minWidth: 36, alignItems: 'flex-end', paddingRight: 8 },
    cancelText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
    },
    segments: {
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 24,
      marginBottom: 8,
    },
    segment: { flex: 1, height: 4, borderRadius: 2 },
    segmentOn: { backgroundColor: theme.colors.primary },
    segmentOff: { backgroundColor: theme.colors.borderMuted },
    content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16 },
    title: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 6,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 19,
    },
    body: { marginTop: 20, flex: 1 },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      gap: 12,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.background,
    },
  });

export default WizardScaffold;
