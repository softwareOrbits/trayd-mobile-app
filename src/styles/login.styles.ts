import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

const MUTED_TEXT = '#5a6577';
const LABEL_TEXT = '#3d4a5c';
const FAINT_TEXT = '#7a8391';
const HAIRLINE = '#D4D7DD';
const CARD_BORDER = '#DDD9CF';
const TEAM_TINT = '#DCE8E0';
const TEAM_INK = '#3D6E55';

export const makeLoginStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 8 },
    banner: { marginBottom: 8 },

    header: { alignItems: 'center', marginTop: 20, gap: 16 },
    logo: { width: 82, height: 60 },
    title: {
      fontSize: 28,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      marginTop: -10,
      fontSize: 14.5,
      fontFamily: theme.fonts.regular,
      color: MUTED_TEXT,
      textAlign: 'center',
    },

    form: { marginTop: 30, gap: 18 },
    fieldLabel: {
      fontSize: 13,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 0.2,
      color: LABEL_TEXT,
      marginBottom: 2,
    },
    input: {
      height: 50,
      paddingVertical: 0,
      borderRadius: 16,
      borderColor: CARD_BORDER,
      backgroundColor: theme.colors.white,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: -2,
    },
    remember: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondary,
    },
    checkboxOff: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: HAIRLINE,
    },
    rememberText: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: LABEL_TEXT,
    },
    forgotText: {
      fontSize: 14,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },

    footer: { marginTop: 'auto', paddingTop: 28 },
    primary: {
      height: 56,
      borderRadius: 16,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.28,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 26,
      marginBottom: 14,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: HAIRLINE },
    dividerText: {
      fontSize: 12,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 1.2,
      color: FAINT_TEXT,
    },

    tiles: { flexDirection: 'row', gap: 10 },
    tile: {
      flex: 1,
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: CARD_BORDER,
      backgroundColor: theme.colors.white,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 13,
    },
    tileIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondary,
    },
    tileIconTeam: { backgroundColor: TEAM_TINT },
    tileTitle: {
      fontSize: 14.5,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      lineHeight: 18,
    },
    tileText: {
      fontSize: 12.5,
      fontFamily: theme.fonts.regular,
      color: MUTED_TEXT,
      lineHeight: 17,
    },
    tileGo: {
      marginTop: 'auto',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tileGoText: {
      fontSize: 13,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.secondary,
    },
    tileGoTextTeam: { color: TEAM_INK },

    fine: {
      marginTop: 16,
      textAlign: 'center',
      fontSize: 11.5,
      fontFamily: theme.fonts.semibold,
      letterSpacing: 0.9,
      color: FAINT_TEXT,
    },
  });
