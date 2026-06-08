import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { JobStatus } from '@/types';

const TONES: Record<JobStatus, { bg: string; fg: string; label: string }> = {
  scheduled: { bg: '#E5F0E9', fg: '#017636', label: 'Scheduled' },
  active: { bg: '#FBE4E4', fg: '#D14343', label: 'Live' },
  paused: { bg: '#EFF1F3', fg: '#5C6571', label: 'Paused' },
  awaiting_review: { bg: '#FAEACF', fg: '#9A6512', label: 'Awaiting review' },
  approved: { bg: '#E5F0E9', fg: '#017636', label: 'Approved' },
  downloaded: { bg: '#E5F0E9', fg: '#017636', label: 'Downloaded' },
  paid: { bg: '#E5F0E9', fg: '#017636', label: 'Paid' },
  cancelled: { bg: '#FBE4E4', fg: '#D14343', label: 'Cancelled' },
};

export const StatusBadge = ({ status }: { status: JobStatus }) => {
  const styles = useThemedStyles(makeStyles);
  const tone = TONES[status];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>
        {tone.label.toUpperCase()}
      </Text>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radii.sm,
    },
    text: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      letterSpacing: 0.6,
    },
  });

export default StatusBadge;
