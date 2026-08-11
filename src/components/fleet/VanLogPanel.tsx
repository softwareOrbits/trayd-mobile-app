import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { ServiceScheduleSection } from '@/components/fleet/ServiceScheduleSection';
import { vanPhotoUrl } from '@/services/fleet';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDayShort } from '@/utils/datetime';
import { firstNameOf } from '@/utils/name';
import { makeFleetStyles } from '@/styles/fleet.styles';
import type {
  VanIssue,
  VanLog,
  VanLogFilter,
  VanMaintenanceEntry,
  VanTask,
} from '@/types';

const FILTERS: { key: VanLogFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'issues', label: 'Issues' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'service', label: 'Service & inspections' },
];

const fmtReported = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} ${time}`;
};

const IssueCard = ({
  issue,
  ownerName,
  mine,
}: {
  issue: VanIssue;
  ownerName: string | null;
  mine: boolean;
}) => {
  const styles = useThemedStyles(makeFleetStyles);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const first = issue.photoPaths[0];
    if (!first) return undefined;
    vanPhotoUrl(first)
      .then(url => active && setPhotoUrl(url))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [issue.photoPaths]);

  const reporter = mine
    ? 'you'
    : firstNameOf(issue.reportedByName) || 'the team';
  const notified = ownerName ? ` · ${ownerName} notified` : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{issue.kind.toUpperCase()}</Text>
        </View>
        <View style={[styles.badge, issue.drivable ? styles.badgeGreen : styles.badgeRed]}>
          <Text
            style={[
              styles.badgeText,
              issue.drivable ? styles.badgeGreenText : styles.badgeRedText,
            ]}
          >
            {issue.drivable ? 'DRIVABLE · WATCHING' : 'OFF THE ROAD'}
          </Text>
        </View>
        <Text style={styles.cardTopMeta}>
          {mine ? 'you logged this' : issue.issueNumber}
        </Text>
      </View>
      <Text style={styles.cardBody}>{issue.description}</Text>
      {photoUrl ? (
        <View style={styles.cardPhotoRow}>
          <Image source={{ uri: photoUrl }} style={styles.cardPhoto} />
        </View>
      ) : null}
      <Text style={styles.cardFooter}>
        {`Reported by ${reporter} · ${fmtReported(issue.createdAt)}${notified}`}
      </Text>
    </View>
  );
};

const TaskCard = ({
  task,
  onPress,
}: {
  task: VanTask;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);
  const creator = firstNameOf(task.creatorName) || 'the office';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={[styles.badge, styles.badgeRed]}>
          <Text style={[styles.badgeText, styles.badgeRedText]}>
            {`TASK${task.deadlineDate ? ` · DUE ${fmtDayShort(task.deadlineDate).toUpperCase()}` : ''}`}
          </Text>
        </View>
        <Text style={styles.cardTopMeta}>{task.taskNumber ?? ''}</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </View>
      <Text style={styles.cardTitle}>{task.title}</Text>
      {task.description ? (
        <Text style={styles.cardBody} numberOfLines={3}>
          {task.description}
        </Text>
      ) : null}
      <Text style={styles.cardFooter}>
        {`Assigned by ${creator}${task.deadlineDate ? ` · ${fmtDayShort(task.deadlineDate)}` : ''}`}
      </Text>
    </Pressable>
  );
};

type HistoryItem =
  | { key: string; type: 'maintenance'; entry: VanMaintenanceEntry }
  | { key: string; type: 'issue'; issue: VanIssue };

const HistoryRow = ({ item, last }: { item: HistoryItem; last: boolean }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);

  const badge =
    item.type === 'maintenance'
      ? item.entry.entryType.toUpperCase()
      : item.issue.kind.toUpperCase();
  const title =
    item.type === 'maintenance' ? item.entry.description : item.issue.description;
  const sub =
    item.type === 'maintenance'
      ? [
          item.entry.loggedByName
            ? `Logged by ${firstNameOf(item.entry.loggedByName)}`
            : null,
          fmtDayShort(item.entry.entryDate),
          item.entry.mileageKm != null
            ? `${item.entry.mileageKm.toLocaleString('en-GB')} km`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : [
          item.issue.reportedByName
            ? `Reported by ${firstNameOf(item.issue.reportedByName)}`
            : null,
          item.issue.resolvedAt ? `resolved ${fmtDayShort(item.issue.resolvedAt)}` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <>
      <View style={styles.historyRow}>
        <View style={styles.historyCheck}>
          <Ionicons name="checkmark" size={15} color={colors.white} />
        </View>
        <View style={styles.historyBody}>
          <View style={styles.historyTopRow}>
            <View style={[styles.badge, styles.badgeNeutral]}>
              <Text style={[styles.badgeText, styles.badgeNeutralText]}>
                {badge}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={[styles.badgeText, styles.badgeGreenText]}>DONE</Text>
            </View>
          </View>
          <Text style={styles.historyTitle} numberOfLines={2}>
            {title}
          </Text>
          {sub ? <Text style={styles.historySub}>{sub}</Text> : null}
        </View>
      </View>
      {last ? null : <View style={styles.historyDivider} />}
    </>
  );
};

export const VanLogPanel = ({
  log,
  ownerName,
  myMemberId,
  canManageSchedule = false,
  onReport,
  onOpenTask,
  onAddScheduleItem,
  onScroll,
  bottomPadding = 24,
}: {
  log: VanLog;
  ownerName: string | null;
  myMemberId: string | null;
  canManageSchedule?: boolean;
  onReport: () => void;
  onOpenTask: (taskId: string) => void;
  onAddScheduleItem?: () => void;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  bottomPadding?: number;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);
  const [filter, setFilter] = useState<VanLogFilter>('all');
  const [filterSheet, setFilterSheet] = useState(false);

  const openIssues = useMemo(
    () => log.issues.filter(i => !i.resolvedAt),
    [log.issues],
  );
  const resolvedIssues = useMemo(
    () => log.issues.filter(i => !!i.resolvedAt),
    [log.issues],
  );

  const year = new Date().getFullYear();
  const loggedThisYear = log.maintenance.filter(
    m => new Date(m.entryDate).getFullYear() === year,
  ).length;

  const showIssues = filter === 'all' || filter === 'issues';
  const showTasks = filter === 'all' || filter === 'tasks';
  const showService = filter === 'all' || filter === 'service';

  const openItems: (
    | { key: string; type: 'issue'; issue: VanIssue }
    | { key: string; type: 'task'; task: VanTask }
  )[] = [
    ...(showIssues
      ? openIssues.map(issue => ({ key: `i-${issue.id}`, type: 'issue' as const, issue }))
      : []),
    ...(showTasks
      ? log.tasks.map(task => ({ key: `t-${task.id}`, type: 'task' as const, task }))
      : []),
  ];

  const history: HistoryItem[] = [
    ...(showService
      ? log.maintenance.map(entry => ({
          key: `m-${entry.id}`,
          type: 'maintenance' as const,
          entry,
        }))
      : []),
    ...(showIssues
      ? resolvedIssues.map(issue => ({
          key: `ri-${issue.id}`,
          type: 'issue' as const,
          issue,
        }))
      : []),
  ].sort((a, b) => {
    const dateOf = (x: HistoryItem) =>
      x.type === 'maintenance' ? x.entry.entryDate : x.issue.resolvedAt ?? '';
    return dateOf(b).localeCompare(dateOf(a));
  });

  const filterLabel = FILTERS.find(f => f.key === filter)?.label ?? 'All';

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.panelContent, { paddingBottom: bottomPadding }]}
      >
        <Pressable style={styles.reportBanner} onPress={onReport}>
          <View style={styles.reportBannerBody}>
            <Text style={styles.reportBannerTitle}>Report a van issue</Text>
            <Text style={styles.reportBannerSub}>
              {`Goes straight to ${ownerName ?? 'the office'} & the van log`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text
              style={[styles.statValue, openIssues.length > 0 && styles.statValueAlert]}
            >
              {openIssues.length}
            </Text>
            <Text style={styles.statLabel}>
              {openIssues.length === 1 ? 'OPEN ISSUE' : 'OPEN ISSUES'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{log.tasks.length}</Text>
            <Text style={styles.statLabel}>
              {log.tasks.length === 1 ? 'TASK OPEN' : 'TASKS OPEN'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loggedThisYear}</Text>
            <Text style={styles.statLabel}>{`LOGGED '${String(year).slice(2)}`}</Text>
          </View>
        </View>

        <Pressable style={styles.filterPill} onPress={() => setFilterSheet(true)}>
          <Ionicons name="funnel-outline" size={15} color={colors.secondary} />
          <Text style={styles.filterText}>{filterLabel}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.sectionLabel}>{`OPEN · ${openItems.length}`}</Text>
        {openItems.length === 0 ? (
          <Text style={styles.emptySection}>Nothing open — all clear.</Text>
        ) : (
          openItems.map(item =>
            item.type === 'issue' ? (
              <IssueCard
                key={item.key}
                issue={item.issue}
                ownerName={ownerName}
                mine={!!myMemberId && item.issue.reportedById === myMemberId}
              />
            ) : (
              <TaskCard
                key={item.key}
                task={item.task}
                onPress={() => onOpenTask(item.task.id)}
              />
            ),
          )
        )}

        {showService ? (
          <ServiceScheduleSection
            items={log.schedule ?? []}
            maintenance={log.maintenance}
            odometerKm={log.vehicle.odometerKm}
            canManage={canManageSchedule && !!onAddScheduleItem}
            onAdd={() => onAddScheduleItem?.()}
          />
        ) : null}

        <Text style={styles.sectionLabel}>HISTORY</Text>
        {history.length === 0 ? (
          <Text style={styles.emptySection}>No log entries yet.</Text>
        ) : (
          <View style={styles.historyCard}>
            {history.map((item, i) => (
              <HistoryRow key={item.key} item={item} last={i === history.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={filterSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterSheet(false)}
      >
        <View style={sheetStyles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterSheet(false)}
          />
          <View style={[sheetStyles.card, { backgroundColor: colors.background }]}>
            {FILTERS.map(f => (
              <Pressable
                key={f.key}
                style={sheetStyles.row}
                onPress={() => {
                  setFilter(f.key);
                  setFilterSheet(false);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    f.key === filter && { color: colors.primary },
                  ]}
                >
                  {f.label}
                </Text>
                {f.key === filter ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});

export default VanLogPanel;
