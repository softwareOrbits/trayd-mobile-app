import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  OnbHeading,
  OnbStep,
  OnbTopMark,
  useOnbStyles,
} from '@/components/onboarding';
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
  const onb = useOnbStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={onb.shell}>
      <ScrollView
        style={onb.shell}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 2, paddingBottom: insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {step ? <OnbStep step={step} total={total} /> : <OnbTopMark />}

        {icon ? (
          <View style={step ? onb.hero : onb.heroSuccess}>{icon}</View>
        ) : null}

        <OnbHeading title={title} sub={subtitle} />
        {children}

        <View style={onb.spacer} />
        <View style={onb.ctas}>{footer}</View>
      </ScrollView>
    </View>
  );
};

export default OnboardingScaffold;
