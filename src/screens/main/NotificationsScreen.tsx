import { type ComponentProps, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  targetFor,
  type NotificationItem,
} from '@/services/notifications';
import type { MainStackParamList } from '@/types';
import { openNotificationTarget } from '@/navigation/navigationRef';
import { useAppDispatch } from '@/store/hooks';
import { setUnread } from '@/store/notificationsSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDMY } from '@/utils/datetime';
import { makeNotificationsStyles } from '@/styles/notifications.styles';
import { ListFooterLoader } from '@/components/ui';
import { PAGE_SIZE } from '@/utils/pagination';

type IconName = ComponentProps<typeof Ionicons>['name'];

const iconFor = (item: NotificationItem): IconName => {
  const s = `${item.type ?? ''} ${item.title}`.toLowerCase();
  if (s.includes('leave')) return 'calendar-outline';
  if (s.includes('assign') || s.includes('job')) return 'briefcase-outline';
  if (s.includes('paid') || s.includes('payment')) return 'cash-outline';
  if (s.includes('invoice') || s.includes('approv'))
    return 'document-text-outline';
  if (s.includes('message') || s.includes('chat'))
    return 'chatbubble-ellipses-outline';
  if (s.includes('note')) return 'create-outline';
  return 'notifications-outline';
};

const fmtAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDMY(new Date(iso));
};

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNotificationsStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const readPending = useRef(new Set<string>());
  const offset = useRef(0);
  const busy = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const unread = items.filter(i => !i.read).length;

  const withPendingReads = (list: NotificationItem[]) => {
    const pending = readPending.current;
    return pending.size
      ? list.map(i => (pending.has(i.id) ? { ...i, read: true } : i))
      : list;
  };

  const load = useCallback(async () => {
    busy.current = true;
    const result = await listNotifications(PAGE_SIZE, 0).catch(() => null);
    busy.current = false;
    if (!result) return;
    const merged = withPendingReads(result.items);
    offset.current = result.fetched ?? 0;
    setHasMore((result.fetched ?? 0) === PAGE_SIZE);
    setItems(merged);
    dispatch(setUnread(merged.filter(i => !i.read).length));
  }, [dispatch]);

  const loadMore = async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setLoadingMore(true);
    const result = await listNotifications(PAGE_SIZE, offset.current).catch(
      () => null,
    );
    busy.current = false;
    setLoadingMore(false);
    if (!result) {
      setHasMore(false);
      return;
    }
    offset.current += result.fetched ?? 0;
    setHasMore((result.fetched ?? 0) === PAGE_SIZE);
    setItems(prev => {
      const seen = new Set(prev.map(i => i.notificationId));
      const next = [
        ...prev,
        ...withPendingReads(result.items).filter(
          i => !seen.has(i.notificationId),
        ),
      ];
      dispatch(setUnread(next.filter(i => !i.read).length));
      return next;
    });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onMarkAllRead = () => {
    if (!unread) return;
    setItems(prev => prev.map(i => ({ ...i, read: true })));
    dispatch(setUnread(0));
    markAllNotificationsRead().catch(() => {});
  };

  const onPressItem = (item: NotificationItem) => {
    if (!item.read) {
      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, read: true } : i)),
      );
      dispatch(setUnread(Math.max(0, unread - 1)));
      readPending.current.add(item.id);
      markNotificationRead(item.id).catch(() => {
        readPending.current.delete(item.id);
      });
    }
    const target = targetFor(item);
    if (target) openNotificationTarget(target);
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <Pressable
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={() => onPressItem(item)}
    >
      <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
        <Ionicons
          name={iconFor(item)}
          size={18}
          color={item.read ? colors.textMuted : colors.primary}
        />
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text
            style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read ? <View style={styles.unreadDot} /> : null}
        </View>
        {item.body ? (
          <Text style={styles.itemText} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        <Text style={styles.itemTime}>{fmtAgo(item.createdAt)}</Text>
      </View>
      {targetFor(item) ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.placeholder}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.secondary} />
          </Pressable>
        ) : (
          <Text style={styles.logo}>TRAYD</Text>
        )}
        <Text style={styles.eyebrow}>
          {unread > 0 ? `${unread} NEW` : 'ALL CLEAR'}
        </Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 ? (
            <Pressable onPress={onMarkAllRead} hitSlop={8} style={styles.markBtn}>
              <Ionicons
                name="checkmark-done"
                size={15}
                color={colors.secondary}
              />
              <Text style={styles.markText}>Mark all read</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.secondary} style={styles.loader} />
      ) : items.length ? (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<ListFooterLoader visible={loadingMore} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.secondary}
              colors={[colors.primary]}
            />
          }
        />
      ) : (
        <View style={styles.empty}>
          <View style={styles.bell}>
            <Ionicons
              name="notifications-outline"
              size={30}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>You’re up to date.</Text>
          <Text style={styles.emptyText}>
            We’ll buzz you when your office assigns a job, approves an invoice, or
            something needs your attention.
          </Text>
        </View>
      )}
    </View>
  );
};

export default NotificationsScreen;
