import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ListFooterLoader } from '@/components/ui';
import { PAGE_SIZE } from '@/utils/pagination';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeTasksStyles } from '@/styles/tasks.styles';
import { fetchTasks } from '@/services/tasks';
import {
  TASK_TAB_STATUS,
  type Task,
  type TaskPeriod,
  type TaskTabKey,
} from '@/types';
import TaskListItem from './TaskListItem';
import TaskPeriodPicker from './TaskPeriodPicker';
import {
  completedSections,
  currentPeriod,
  dayHeaderLabel,
  doneWhenLabel,
  isOverdue,
  periodLabel,
  vehicleLabel,
} from './tasks.helpers';

export type TaskCounts = Record<TaskTabKey, number>;

const EMPTY: Record<TaskTabKey, { title: string; text: string }> = {
  upcoming: {
    title: 'Nothing on the go',
    text: 'Tasks assigned to you show up here.',
  },
  live: {
    title: 'Nothing on the go',
    text: 'Tasks you’ve started show up here.',
  },
  completed: {
    title: 'No completed tasks',
    text: 'Nothing logged here. Pick another date above.',
  },
};

type Props = {
  activeTab: TaskTabKey;
  bottomInset: number;
  onOpenTask: (taskId: string) => void;
  onCounts: (counts: TaskCounts) => void;
};

export const TasksPanel = ({
  activeTab,
  bottomInset,
  onOpenTask,
  onCounts,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTasksStyles);

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TaskPeriod>(currentPeriod);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    busy.current = true;
    try {
      const page = await fetchTasks({ offset: 0, limit: PAGE_SIZE });
      setTasks(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setTasks(prev => prev ?? []);
    } finally {
      busy.current = false;
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || tasks === null) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchTasks({ offset: tasks.length, limit: PAGE_SIZE });
      setTasks(prev => {
        const seen = new Set((prev ?? []).map(t => t.id));
        return [...(prev ?? []), ...page.filter(t => !seen.has(t.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, tasks]);

  const onNearEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 320) {
      loadMore();
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const list = tasks ?? [];
    onCounts({
      upcoming: list.filter(t => t.status === 'assigned').length,
      live: list.filter(t => t.status === 'in_progress').length,
      completed: list.filter(t => t.status === 'complete').length,
    });
  }, [tasks, onCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => {
    const list = (tasks ?? []).filter(
      t => t.status === TASK_TAB_STATUS[activeTab],
    );
    return list.sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return (a.deadlineDate ?? '').localeCompare(b.deadlineDate ?? '');
    });
  }, [tasks, activeTab]);

  const sections = useMemo(
    () => completedSections(tasks ?? [], period),
    [tasks, period],
  );
  const completedCount = useMemo(
    () => sections.reduce((s, sec) => s + sec.tasks.length, 0),
    [sections],
  );

  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.secondary}
      colors={[colors.primary]}
    />
  );

  if (tasks === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (activeTab === 'completed') {
    return (
      <>
        <ScrollView
          contentContainerStyle={[
            styles.completedContent,
            { paddingBottom: bottomInset + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={refresh}
          onScroll={onNearEnd}
          scrollEventThrottle={100}
        >
          <Pressable
            style={styles.periodPill}
            onPress={() => setPickerOpen(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
            <Text style={styles.periodText}>{periodLabel(period)}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          <Text style={styles.periodCount}>
            {`${completedCount} completed task${completedCount === 1 ? '' : 's'} · ${periodLabel(period)}`}
          </Text>

          {completedCount === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="checkbox-outline"
                  size={28}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>{EMPTY.completed.title}</Text>
              <Text style={styles.emptyText}>
                {`Nothing logged for ${periodLabel(period)}. Pick another date above.`}
              </Text>
            </View>
          ) : (
            sections.map(section => (
              <Fragment key={section.date}>
                <Text style={styles.dayHeader}>
                  {dayHeaderLabel(section.date)}
                </Text>
                <View style={styles.doneCard}>
                  {section.tasks.map((task, i) => {
                    const fleet = vehicleLabel(task);
                    return (
                      <Fragment key={task.id}>
                        {i > 0 ? <View style={styles.doneDivider} /> : null}
                        <Pressable
                          style={styles.doneRow}
                          onPress={() => onOpenTask(task.id)}
                        >
                          <View style={styles.doneBody}>
                            <Text style={styles.doneWhen}>
                              {`✓ Done · ${doneWhenLabel(section.date)}`}
                            </Text>
                            <View style={styles.doneTitleRow}>
                              <Text style={styles.doneTitle} numberOfLines={1}>
                                {task.title}
                              </Text>
                              {fleet ? (
                                <View style={styles.doneFleet}>
                                  <Text style={styles.doneFleetText}>FLEET</Text>
                                </View>
                              ) : null}
                            </View>
                            {task.description ? (
                              <Text style={styles.doneSub} numberOfLines={1}>
                                {task.description}
                              </Text>
                            ) : null}
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={colors.green}
                          />
                        </Pressable>
                      </Fragment>
                    );
                  })}
                </View>
              </Fragment>
            ))
          )}
          <ListFooterLoader visible={loadingMore} />
        </ScrollView>

        <TaskPeriodPicker
          visible={pickerOpen}
          value={period}
          onSelect={setPeriod}
          onClose={() => setPickerOpen(false)}
        />
      </>
    );
  }

  return (
    <FlatList
      data={visible}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TaskListItem task={item} onPress={() => onOpenTask(item.id)} />
      )}
      contentContainerStyle={[styles.list, { paddingBottom: bottomInset + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={refresh}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListFooterComponent={<ListFooterLoader visible={loadingMore} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="checkbox-outline"
              size={28}
              color={colors.textMuted}
            />
          </View>
          <Text style={styles.emptyTitle}>{EMPTY[activeTab].title}</Text>
          <Text style={styles.emptyText}>{EMPTY[activeTab].text}</Text>
        </View>
      }
    />
  );
};

export default TasksPanel;
