import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { ReviewBadgeProps, ReviewStatus } from '@/types';

const TONES: Record<ReviewStatus, { bg: string; fg: string; label: string }> = {
  approved: { bg: '#E5F0E9', fg: '#017636', label: 'Approved' },
  awaiting_review: { bg: '#FAEACF', fg: '#9A6512', label: 'Awaiting review' },
};

export const ReviewBadge = ({ review }: ReviewBadgeProps) => {
  const styles = useThemedStyles(makeStyles);
  const tone = TONES[review];
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

export default ReviewBadge;
