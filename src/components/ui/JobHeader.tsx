import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  title: string;
  /** Shows the bordered back button when provided. */
  onBack?: () => void;
  /** Right-side action (defaults to a "Cancel" link). */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Custom right slot, overrides the cancel link. */
  right?: ReactNode;
  /** Set false to skip the top safe-area padding (e.g. inside a modal). */
  withInset?: boolean;
};

/**
 * Shared job-flow header: a bordered back button (left), a centred title, and
 * a right action. Used by the start-job / wrap-up wizards and the add-content
 * screens so every job screen shares one chrome.
 */
export const JobHeader = ({
  title,
  onBack,
  onCancel,
  cancelLabel = 'Cancel',
  right,
  withInset = true,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: (withInset ? insets.top : 0) + 8 }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={colors.secondary} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={[styles.side, styles.sideRight]}>
        {right ??
          (onCancel ? (
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
          ) : null)}
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: theme.colors.background,
    },
    side: { width: 72, justifyContent: 'center' },
    sideRight: { alignItems: 'flex-end' },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    cancelText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.textMuted,
    },
  });

export default JobHeader;
