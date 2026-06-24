import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeWorkingHoursStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 12 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: 4,
    },
    dayCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    dayTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayLabel: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    dayRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dayState: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    timeChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    timeChipLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    timeChipValue: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    copyText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.secondary,
    },

    pickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    pickerCard: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      paddingVertical: 16,
      paddingHorizontal: 8,
      maxHeight: '60%',
    },
    pickerTitle: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    pickerList: { paddingHorizontal: 8 },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    pickerRowText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    pickerRowActive: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.primary,
    },
  });
