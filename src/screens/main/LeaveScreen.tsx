import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AskTraydFab, ErrorBoundary, useBottomNavHeight } from '@/components/ui';
import { LeaveHeader, LeaveFilters, LeaveRequestList } from '@/components/leave';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { makeLeaveStyles, makeLeaveBodyStyles } from '@/styles/leave.styles';
import { fetchLeaveBalances, fetchLeaveRequests } from '@/services/leave';
import {
  type LeaveBalance,
  type LeaveRequest,
  type LeaveStatusFilter,
  type LeaveTypeFilter,
  type MainStackParamList,
} from '@/types';

const LeaveScreenInner = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveStyles);
  const body = useThemedStyles(makeLeaveBodyStyles);
  const navHeight = useBottomNavHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { collapsed, onScroll } = useCollapsibleOnScroll();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<LeaveStatusFilter>('all');

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    const [, reqs] = await Promise.allSettled([
      fetchLeaveBalances().then(b => isActive() && setBalances(b)),
      fetchLeaveRequests().then(r => {
        if (!isActive()) return;
        setRequests(r);
        setLoadError(false);
      }),
    ]);
    if (!isActive()) return;
    if (reqs.status === 'rejected') setLoadError(true);
    setLoading(false);
  }, []);

  const retry = () => {
    setLoading(true);
    load();
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      StatusBar.setBarStyle('dark-content');
      return () => {
        active = false;
      };
    }, [load]),
  );

  const filtered = useMemo(
    () =>
      requests.filter(
        r =>
          (typeFilter === 'all' || r.type === typeFilter) &&
          (statusFilter === 'all' || r.status === statusFilter),
      ),
    [requests, typeFilter, statusFilter],
  );

  const onPressRequest = (r: LeaveRequest) =>
    navigation.navigate('LeaveRequestDetail', { request: r });

  // First load only. Refreshes on focus stay silent, so returning to the screen
  // doesn't blank out the balances you're already looking at.
  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: navHeight + 24 },
        ]}
      >
        <LeaveHeader
          balances={balances}
          onRequest={() => navigation.navigate('NewLeaveRequest')}
        />
        <View style={styles.body}>
          {loadError ? (
            <View style={body.emptyCard}>
              <View style={body.errorIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color={colors.error}
                />
              </View>
              <Text style={body.emptyTitle}>Couldn’t load your time off</Text>
              <Text style={body.emptyText}>
                Check your connection and try again.
              </Text>
              <Pressable
                accessibilityRole="button"
                style={body.retryBtn}
                onPress={retry}
              >
                <Ionicons name="refresh" size={16} color={colors.text} />
                <Text style={body.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {requests.length > 0 ? (
                <>
                  <LeaveFilters
                    requests={requests}
                    typeFilter={typeFilter}
                    statusFilter={statusFilter}
                    onTypeChange={setTypeFilter}
                    onStatusChange={setStatusFilter}
                  />
                  <Text style={body.countText}>
                    {filtered.length} request{filtered.length === 1 ? '' : 's'}
                  </Text>
                </>
              ) : null}
              {requests.length > 0 && filtered.length === 0 ? (
                <View style={body.emptyCard}>
                  <View style={body.emptyIcon}>
                    <Ionicons
                      name="funnel-outline"
                      size={26}
                      color={colors.textMuted}
                    />
                  </View>
                  <Text style={body.emptyTitle}>No matching requests</Text>
                  <Text style={body.emptyText}>
                    Nothing matches these filters — try a different type or
                    status.
                  </Text>
                </View>
              ) : (
                <LeaveRequestList
                  requests={filtered}
                  onPressRequest={onPressRequest}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
      <AskTraydFab collapsed={collapsed} />
    </View>
  );
};

const LeaveScreen = () => (
  <ErrorBoundary title="Time off hit a snag">
    <LeaveScreenInner />
  </ErrorBoundary>
);

export default LeaveScreen;
