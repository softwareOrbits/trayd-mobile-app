import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeOnboardingStyles, ONB } from '@/styles/onboarding.styles';
import TraydMark from './TraydMark';

export { default as TraydMark } from './TraydMark';
export * from './heroes';
export { ONB } from '@/styles/onboarding.styles';

export const useOnbStyles = () => useThemedStyles(makeOnboardingStyles);

export const OnbTopMark = () => {
  const styles = useOnbStyles();
  return (
    <View style={styles.topMark}>
      <TraydMark />
    </View>
  );
};

export const OnbStep = ({ step, total }: { step: number; total: number }) => {
  const styles = useOnbStyles();
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepTrack}>
        <View style={[styles.stepFill, { width: `${(step / total) * 100}%` }]} />
      </View>
      <Text style={styles.stepLabel}>{`STEP ${step} OF ${total}`}</Text>
    </View>
  );
};

export const OnbHeading = ({
  title,
  sub,
}: {
  title: ReactNode;
  sub?: ReactNode;
}) => {
  const styles = useOnbStyles();
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
};

export const AmberButton = ({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) => {
  const styles = useOnbStyles();
  const off = disabled || loading;
  return (
    <Pressable
      style={[styles.amberBtn, off && styles.btnOff]}
      onPress={onPress}
      disabled={off}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ONB.navy} />
      ) : (
        <Text style={styles.amberBtnText}>{label}</Text>
      )}
    </Pressable>
  );
};

export const OutlineButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) => {
  const styles = useOnbStyles();
  return (
    <Pressable
      style={[styles.outlineBtn, disabled && styles.btnOff]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </Pressable>
  );
};

export const OnbLink = ({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) => {
  const styles = useOnbStyles();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
};

export const OnbCTAs = ({
  primary,
  onPrimary,
  loading,
  disabled,
  secondary,
  onSecondary,
}: {
  primary: string;
  onPrimary?: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
}) => {
  const styles = useOnbStyles();
  return (
    <>
      <View style={styles.spacer} />
      <View style={styles.ctas}>
        <AmberButton
          label={primary}
          onPress={onPrimary}
          loading={loading}
          disabled={disabled}
        />
        {secondary ? (
          <OnbLink label={secondary} onPress={onSecondary} />
        ) : null}
      </View>
    </>
  );
};

export const IdentRow = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => {
  const styles = useOnbStyles();
  return (
    <View style={styles.identRow}>
      <Text style={styles.identLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.identValue, mono && styles.identValueMono]}>
        {value}
      </Text>
    </View>
  );
};

export const OnbDivider = () => {
  const styles = useOnbStyles();
  return <View style={styles.divider} />;
};

export const StrengthMeter = ({
  filled,
  label,
}: {
  filled: number;
  label: string;
}) => {
  const styles = useOnbStyles();
  return (
    <View>
      <View style={styles.meterRow}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.meterSeg, i < filled && styles.meterSegOn]}
          />
        ))}
      </View>
      <View style={styles.meterLabels}>
        <Text style={styles.meterText}>Password strength</Text>
        <Text style={[styles.meterText, styles.meterValue]}>{label}</Text>
      </View>
    </View>
  );
};

export const RuleCheck = ({ ok, label }: { ok: boolean; label: string }) => {
  const styles = useOnbStyles();
  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkDot, ok && styles.checkDotOn]}>
        {ok ? (
          <Svg width={10} height={10} viewBox="0 0 12 12">
            <Path
              d="M2 6.5l2.5 2.5L10 3.5"
              stroke={ONB.navy}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        ) : null}
      </View>
      <Text style={[styles.checkLabel, ok && styles.checkLabelOn]}>
        {label}
      </Text>
    </View>
  );
};
