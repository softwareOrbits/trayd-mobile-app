import { type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Theme } from '@/theme';
import { subtitleStyles, titleStyles } from '@/theme/constants';
import { useThemedStyles } from '@/utils/useThemedStyles';

type OnboardingScaffoldProps = {
  step?: number;
  total?: number;
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
};

export const OnboardingScaffold = ({
  step,
  total = 3,
  icon,
  title,
  subtitle,
  children,
  footer,
}: OnboardingScaffoldProps) => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step ? (
          <View style={styles.progressRow}>
            <View style={styles.segments}>
              {Array.from({ length: total }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    i < step ? styles.segmentOn : styles.segmentOff,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.stepLabel}>{`STEP ${step} OF ${total}`}</Text>
          </View>
        ) : null}

        <Image
          source={require('@assets/images/small_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {step ? (
          <>
            <View style={styles.iconArea}>{icon}</View>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              {children}
            </View>
          </>
        ) : (
          <View style={styles.centeredGroup}>
            {icon}
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {children}
          </View>
        )}

        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
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

export default OnboardingScaffold;
