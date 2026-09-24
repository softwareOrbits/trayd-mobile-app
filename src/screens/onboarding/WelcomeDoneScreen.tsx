import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  AmberButton,
  HeroSuccess,
  useOnbStyles,
} from '@/components/onboarding';
import { usePrimingComplete } from '@/navigation/OnboardingStack';
import {
  fetchMyMember,
  fetchMyNextJob,
  type MemberProfile,
  type NextJob,
} from '@/services/member';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeWelcomeDoneStyles } from '@/styles/welcomeDone.styles';
import OnboardingScaffold from './OnboardingScaffold';

const firstName = (fullName: string | null | undefined) =>
  fullName?.trim().split(/\s+/)[0] ?? 'there';

const WelcomeDoneScreen = () => {
  const styles = useThemedStyles(makeWelcomeDoneStyles);
  const onb = useOnbStyles();
  const complete = usePrimingComplete();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [nextJob, setNextJob] = useState<NextJob | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyMember()
      .then(m => {
        if (!active) return;
        setMember(m);
        return fetchMyNextJob(m.id).then(j => active && setNextJob(j));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <OnboardingScaffold
      icon={<HeroSuccess />}
      title={`You're in, ${firstName(member?.fullName)}`}
      subtitle={
        member?.companyName ? (
          <>
            <Text style={onb.subStrong}>{member.companyName}</Text>
            {' will send jobs to you here.'}
            {nextJob ? ' Your first one is waiting in the queue.' : ''}
          </>
        ) : (
          "You're all set. Jobs will show up here."
        )
      }
      footer={<AmberButton label="Enter Trayd" onPress={complete} />}
    >
      {nextJob ? (
        <View style={styles.jobCard}>
          <View style={styles.jobBadge}>
            <Text style={styles.jobBadgeText}>1</Text>
          </View>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {nextJob.title}
            </Text>
            {nextJob.meta ? (
              <Text style={styles.jobMeta} numberOfLines={1}>
                {nextJob.meta}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </OnboardingScaffold>
  );
};

export default WelcomeDoneScreen;
