import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';
import { subtitleStyles, titleStyles } from '@/theme/constants';

export const makeOnboardingScaffoldStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    segments: { flex: 1, flexDirection: 'row', gap: 6 },
    segment: { flex: 1, height: 4, borderRadius: 2 },
    segmentOn: { backgroundColor: theme.colors.primary },
    segmentOff: { backgroundColor: theme.colors.borderMuted },
    stepLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 0.5,
    },
    logo: { width: 62, height: 40, alignSelf: 'center', marginTop: 24 },
    iconArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 160,
    },
    textBlock: { alignItems: 'center' },
    centeredGroup: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    title: titleStyles,
    subtitle: {
      ...subtitleStyles,
      paddingHorizontal: 12,
    },
    footer: { gap: 12, marginTop: 28 },
  });
