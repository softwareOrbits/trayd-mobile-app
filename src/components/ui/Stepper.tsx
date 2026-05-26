import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { StepperProps } from '@/types';

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  const { colors, fonts } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        const filled = isActive || isDone;

        return (
          <View key={step.label} style={styles.item}>
            <View style={styles.head}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: filled ? colors.secondary : colors.surface,
                    borderColor: filled ? colors.secondary : colors.borderMuted,
                  },
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color={colors.onSecondary} />
                ) : (
                  <Text
                    style={[
                      styles.number,
                      { color: filled ? colors.onSecondary : colors.textMuted },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color: filled ? colors.text : colors.textMuted,
                    fontFamily: isActive ? fonts.bold : fonts.medium,
                  },
                ]}
              >
                {step.label}
              </Text>
            </View>
            <View
              style={[
                styles.bar,
                { backgroundColor: filled ? colors.secondary : colors.borderMuted },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    item: { flex: 1 },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    circle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    number: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
    },
    label: {
      marginLeft: theme.spacing.sm,
      flexShrink: 1,
      fontSize: theme.typography.size.sm,
    },
    bar: { height: 2, borderRadius: 2, width: '100%' },
  });

export default Stepper;
