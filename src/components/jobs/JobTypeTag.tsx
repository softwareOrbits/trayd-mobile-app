import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import { JOB_TYPE_LABEL, type JobType } from '@/types';

/** Small tag for non-standard job types (Quote / Emergency / Multi-day). */
export const JobTypeTag = ({ type }: { type: JobType }) => {
  const styles = useThemedStyles(makeStyles);
  if (type === 'standard') return null;
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{JOB_TYPE_LABEL[type].toUpperCase()}</Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    tag: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    text: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },
  });

export default JobTypeTag;
