import { StyleSheet, Text } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';

export const JobSectionHeader = ({
  label,
  divider,
}: {
  label: string;
  divider?: boolean;
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={[styles.label, divider && styles.divider]}>
      {label.toUpperCase()}
    </Text>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    label: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
      backgroundColor: theme.colors.surface,
      paddingTop: 20,
      paddingBottom: 10,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

export default JobSectionHeader;
