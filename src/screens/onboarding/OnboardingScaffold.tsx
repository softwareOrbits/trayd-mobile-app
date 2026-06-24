import { type ReactNode } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeOnboardingScaffoldStyles } from '@/styles/onboardingScaffold.styles';
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
  const styles = useThemedStyles(makeOnboardingScaffoldStyles);
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

export default OnboardingScaffold;
