import { useCallback } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AskTraydFab, useBottomNavHeight } from '@/components/ui';
import {
  DashboardProvider,
  DashboardHeader,
  TodayCard,
  GettingStarted,
  QuickActions,
  TodayJobs,
  QuickAccess,
  VanIssuePromo,
  type DashboardVariant,
} from '@/components/dashboard';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { makeDashboardStyles } from '@/styles/dashboard.styles';

const VARIANT: DashboardVariant = 'active';

const DashboardScreen = () => {
  const styles = useThemedStyles(makeDashboardStyles);
  const navHeight = useBottomNavHeight();
  const dispatch = useAppDispatch();
  const { collapsed, onScroll } = useCollapsibleOnScroll();

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchJobs());
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, [dispatch]),
  );

  return (
    <DashboardProvider>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: navHeight + 24 }]}
        >
          <DashboardHeader variant={VARIANT} />
          <View style={styles.body}>
            {VARIANT === 'active' ? (
              <>
                <TodayJobs />
                <QuickAccess />
                <VanIssuePromo />
              </>
            ) : (
              <>
                <TodayCard />
                <GettingStarted />
                <QuickActions />
              </>
            )}
          </View>
        </ScrollView>
        <AskTraydFab collapsed={collapsed} />
      </View>
    </DashboardProvider>
  );
};

export default DashboardScreen;
