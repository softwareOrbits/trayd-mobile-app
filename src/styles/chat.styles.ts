import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeChatStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.colors.textMuted,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: { backgroundColor: theme.colors.primary },
    titleCol: { flex: 1 },
    title: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    timer: {
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.primary,
    },
    content: { padding: 16, paddingBottom: 24 },
    startedNote: {
      alignSelf: 'center',
      marginBottom: 18,
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
  });
