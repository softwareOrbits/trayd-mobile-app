import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme';

export const makeCertComplianceStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8, 
    },
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    headText: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      lineHeight: 18,
    },
    list: { gap: 6 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    itemName: {
      flex: 1,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    itemReason: {
      fontSize: 11,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 0.3,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingTop: 2,
    },
    ctaText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
    },
  });

export default makeCertComplianceStyles;
