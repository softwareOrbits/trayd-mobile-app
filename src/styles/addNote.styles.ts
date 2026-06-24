import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeAddNoteStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 60,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    headerSpacer: { width: 60 },

    content: { paddingHorizontal: 20, paddingBottom: 24 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: 14,
    },
    noteInput: { minHeight: 140, textAlignVertical: 'top' },

    sectionLabel: {
      marginTop: 22,
      marginBottom: 10,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    optionGroup: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
    },
    optionDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    radioOn: { borderColor: theme.colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    optionBody: { flex: 1, gap: 3 },
    optionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    optionTitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    optionDesc: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
    },

    footer: { paddingHorizontal: 20, paddingTop: 12 },
  });
