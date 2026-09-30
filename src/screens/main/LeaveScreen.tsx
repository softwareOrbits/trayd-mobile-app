import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  AskTraydFab,
  ErrorBoundary,
  ListFooterLoader,
  useBottomNavHeight,
} from '@/components/ui';
import { PAGE_SIZE } from '@/utils/pagination';
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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    const [, reqs] = await Promise.allSettled([
      fetchLeaveBalances().then(b => isActive() && setBalances(b)),
      fetchLeaveRequests({ offset: 0, limit: PAGE_SIZE }).then(r => {
        if (!isActive()) return;
        setRequests(r);
        setHasMore(r.length === PAGE_SIZE);
        setLoadError(false);
      }),
    ]);
    if (!isActive()) return;
    if (reqs.status === 'rejected') setLoadError(true);
    setLoading(false);
  }, []);

  const loadMore = async () => {
    if (busy.current || !hasMore || loadError) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchLeaveRequests({
        offset: requests.length,
        limit: PAGE_SIZE,
      });
      setRequests(prev => {
        const seen = new Set(prev.map(r => r.id));
        return [...prev, ...page.filter(r => !seen.has(r.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScroll(e);
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 320) {
      loadMore();
    }
  };

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
        onScroll={handleScroll}
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
          <ListFooterLoader visible={loadingMore} />
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
