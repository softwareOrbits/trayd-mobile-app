import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

export const makeAddReceiptStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    extractingText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 56,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    cancelSpacer: { width: 56 },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    content: { paddingHorizontal: 20, paddingBottom: 24 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      marginBottom: 14,
    },

    autoCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 12,
    },
    thumb: {
      width: 54,
      height: 64,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    autoBody: { flex: 1, gap: 6 },
    autoLabel: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    autoVendor: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    chipRow: { flexDirection: 'row', gap: 6 },
    chip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    chipText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.secondary,
    },
    confBanner: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    confMed: { backgroundColor: theme.colors.warningBg },
    confLow: { backgroundColor: '#F6D9D2' },
    confText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.text,
    },

    sectionLabel: {
      marginTop: 20,
      marginBottom: 8,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    fieldCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    fieldBody: { flex: 1, gap: 2 },
    fieldValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    fieldSub: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },

    lineHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 8,
    },
    addLink: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    linesCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 13,
    },
    lineDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    lineMain: { flex: 1, gap: 3 },
    lineDesc: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
    },
    lineLow: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      color: theme.colors.primary,
    },
    lineAmount: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    emptyLines: {
      paddingVertical: 16,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    headsUp: {
      marginTop: 18,
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.md,
      padding: 12,
      gap: 4,
    },
    headsUpLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    headsUpText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 19,
    },

    totalsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    totalRowLast: { borderBottomWidth: 0 },
    totalLabel: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    totalValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    totalStrong: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.borderMuted,
    },
    chooseTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    chooseText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 32,
    },
    discardBtn: { alignSelf: 'center', paddingVertical: 4 },
    discardText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
      textDecorationLine: 'underline',
    },

    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 20,
      gap: 14,
    },
    sheetTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    sheetRow: { flexDirection: 'row', gap: 12 },
    sheetRowItem: { flex: 1 },
    deleteBtn: { alignSelf: 'center', paddingVertical: 4 },
    deleteText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.error,
    },
  });
