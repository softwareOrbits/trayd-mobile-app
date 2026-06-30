import { type ComponentProps, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  listNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/services/notifications';
import { useAppDispatch } from '@/store/hooks';
import { setUnread } from '@/store/notificationsSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeNotificationsStyles } from '@/styles/notifications.styles';

type IconName = ComponentProps<typeof Ionicons>['name'];

const iconFor = (item: NotificationItem): IconName => {
  const s = `${item.type ?? ''} ${item.title}`.toLowerCase();
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
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

const NotificationsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNotificationsStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unread = items.filter(i => !i.read).length;

  const load = useCallback(async () => {
    const result = await listNotifications().catch(() => null);
    if (result) {
      setItems(result.items);
      dispatch(setUnread(result.unread));
    }
  }, [dispatch]);

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

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.card, !item.read && styles.cardUnread]}>
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
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>TRAYD</Text>
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
