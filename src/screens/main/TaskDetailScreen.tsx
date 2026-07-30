import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, JobFooter, JobHeader } from '@/components/ui';
import { LocationCard } from '@/components/jobDetail';
import { TaskAvatar } from '@/components/tasks';
import {
  deadlineLabel,
  isOverdue,
  vehicleLabel,
} from '@/components/tasks/tasks.helpers';
import {
  addTaskNote,
  fetchTaskDetail,
  fetchTaskEvents,
  setTaskStatus,
} from '@/services/tasks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtEventStamp } from '@/utils/datetime';
import { toastError, toastSuccess } from '@/utils/toast';
import { makeTaskDetailStyles } from '@/styles/taskDetail.styles';
import type { MainStackParamList, Task, TaskEvent, TaskStatus } from '@/types';

type Step = {
  key: 'assigned' | 'started' | 'completed';
  label: string;
  done: boolean;
  sub: string;
  danger?: boolean;
};

const buildSteps = (task: Task, events: TaskEvent[]): Step[] => {
  const last = (kind: TaskEvent['event']) =>
    [...events].reverse().find(e => e.event === kind) ?? null;
  const assigned = last('assigned');
  const started = last('started');
  const completed = last('completed');
  const overdue = isOverdue(task);

  return [
    {
      key: 'assigned',
      label: 'Assigned',
      done: true,
      sub: assigned
        ? `by ${assigned.actorName ?? task.creator?.name ?? 'your team'} · ${fmtEventStamp(assigned.createdAt)}`
        : `by ${task.creator?.name ?? 'your team'}`,
    },
    {
      key: 'started',
      label: 'In progress',
      done: !!started,
      danger: !started && overdue,
      sub: started
        ? `${started.actorName ?? 'You'} started · ${fmtEventStamp(started.createdAt)}${
            started.note ? ` · “${started.note}”` : ''
          }`
        : overdue
          ? 'Overdue — not started'
          : 'Pending',
    },
    {
      key: 'completed',
      label: 'Complete',
      done: !!completed,
      sub: completed
        ? `Marked done${completed.note ? ` · “${completed.note}”` : ''}`
        : 'Pending',
    },
  ];
};

const TaskDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeTaskDetailStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'TaskDetail'>>();

  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<TaskStatus | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const draftKey = `tasknote:${params.taskId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(draftKey)
      .then(saved => {
        if (active && saved) setNote(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [draftKey]);

  const changeNote = (text: string) => {
    setNote(text);
    if (text.trim()) {
      AsyncStorage.setItem(draftKey, text).catch(() => {});
    } else {
      AsyncStorage.removeItem(draftKey).catch(() => {});
    }
  };

  const load = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([
        fetchTaskDetail(params.taskId),
        fetchTaskEvents(params.taskId).catch(() => [] as TaskEvent[]),
      ]);
      setTask(t);
      setEvents(e);
    } catch (err) {
      toastError(err, 'Could not load this task.');
    }
  }, [params.taskId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveNote = async () => {
    if (!note.trim() || savingNote || busy) return;
    setSavingNote(true);
    try {
      await addTaskNote(params.taskId, note);
      toastSuccess('Note saved.');
      setNote('');
      AsyncStorage.removeItem(draftKey).catch(() => {});
      setEvents(await fetchTaskEvents(params.taskId).catch(() => events));
    } catch (e) {
      toastError(e, 'Could not save the note.');
    } finally {
      setSavingNote(false);
    }
  };

  const changeStatus = async (status: TaskStatus, withNote?: boolean) => {
    if (busy) return;
    setBusy(status);
    try {
      await setTaskStatus(params.taskId, status, withNote ? note : null);
      toastSuccess(
        status === 'complete'
          ? 'Task complete.'
          : status === 'in_progress'
            ? 'Task started.'
            : 'Task reopened.',
      );
      if (withNote && note.trim()) {
        setNote('');
        AsyncStorage.removeItem(draftKey).catch(() => {});
      }
      await load();
    } catch (e) {
      toastError(e, 'Could not update the task.');
    } finally {
      setBusy(null);
    }
  };

  if (!task) {
    return (
      <View style={styles.flex}>
        <JobHeader title="Task" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      </View>
    );
  }

  const fleet = vehicleLabel(task);
  const overdue = isOverdue(task);
  const steps = buildSteps(task, events);
  const savedNotes = [...events]
    .filter(e => (e.event === 'note' || e.event === 'edited') && !!e.note)
    .reverse();
  const assignedBy = task.creator?.name ?? 'your team';
  const staff = task.creator ? !task.creator.isOwner : false;
  const assignedEvent = [...events].reverse().find(e => e.event === 'assigned');
  const assignedStamp = assignedEvent ? fmtEventStamp(assignedEvent.createdAt) : null;
  const ownerName = task.creator?.name ?? 'the office';

  const STATUS_CHIP: Record<TaskStatus, { label: string; bg: string; fg: string }> =
    {
      assigned: { label: 'ASSIGNED', bg: colors.warningBg, fg: colors.warning },
      in_progress: {
        label: 'IN PROGRESS',
        bg: colors.surfaceMuted,
        fg: colors.secondary,
      },
      complete: { label: 'COMPLETE', bg: colors.surfaceMuted, fg: colors.green },
    };
  const chip = STATUS_CHIP[task.status];

  return (
    <View style={styles.flex}>
      <JobHeader title={task.title} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.statusText, { color: chip.fg }]}>
              {chip.label}
            </Text>
          </View>
          <Text
            style={[styles.dueText, overdue && { color: colors.error }]}
            numberOfLines={1}
          >
            {`DUE ${deadlineLabel(task).toUpperCase()}`}
          </Text>
          {fleet ? (
            <View style={styles.fleetChip}>
              <Ionicons name="car-outline" size={12} color={colors.textMuted} />
              <Text style={styles.fleetText}>{fleet}</Text>
            </View>
          ) : null}
        </View>

        {task.description || assignedStamp ? (
          <View style={styles.card}>
            {task.description ? (
              <Text style={styles.cardDesc}>{task.description}</Text>
            ) : null}
            {task.description ? <View style={styles.cardDivider} /> : null}
            <View style={styles.assignedByRow}>
              <TaskAvatar name={assignedBy} size={28} />
              <Text style={styles.assignedByText} numberOfLines={1}>
                {`Assigned by ${assignedBy}`}
                {assignedStamp ? ` · ${assignedStamp}` : ''}
              </Text>
              {staff ? (
                <View style={styles.staffChip}>
                  <Text style={styles.staffText}>STAFF</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.blockLabel}>DEADLINE</Text>
          <View style={styles.deadlineRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={overdue ? colors.error : colors.secondary}
            />
            <Text
              style={[styles.deadlineText, overdue && { color: colors.error }]}
            >
              {overdue ? `${deadlineLabel(task)} · overdue` : deadlineLabel(task)}
            </Text>
          </View>
        </View>

        {task.address || task.eircode ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>LOCATION</Text>
            <LocationCard address={task.address} eircode={task.eircode} />
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockLabel}>PROGRESS</Text>
          <View style={styles.timeline}>
            {steps.map((step, i) => (
              <View key={step.key} style={styles.step}>
                <View style={styles.stepGutter}>
                  <View
                    style={[
                      styles.stepDot,
                      step.done && styles.stepDotDone,
                      step.danger && styles.stepDotDanger,
                    ]}
                  >
                    {step.done ? (
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    ) : null}
                  </View>
                  {i < steps.length - 1 ? (
                    <View
                      style={[styles.stepLine, step.done && styles.stepLineDone]}
                    />
                  ) : null}
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text
                    style={[styles.stepSub, step.danger && { color: colors.error }]}
                  >
                    {step.sub}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {savedNotes.length ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>NOTES</Text>
            <View style={styles.card}>
              {savedNotes.map((e, i) => (
                <View key={`${e.createdAt}-${i}`} style={styles.noteEntry}>
                  {i > 0 ? <View style={styles.cardDivider} /> : null}
                  <Text style={styles.cardDesc}>{e.note}</Text>
                  <Text style={styles.noteMeta}>
                    {`${e.actorName ?? 'You'} · ${fmtEventStamp(e.createdAt)}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {task.status !== 'complete' ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>ADD A NOTE · OPTIONAL</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. picked up — two boxes, rest on back order"
              placeholderTextColor={colors.placeholder}
              value={note}
              onChangeText={changeNote}
              multiline
            />
            <View style={styles.noteActions}>
              <Button
                label="Save note"
                size="sm"
                variant="outlined"
                color="secondary"
                leftIcon="create-outline"
                loading={savingNote}
                disabled={!note.trim() || !!busy}
                onPress={saveNote}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {task.status !== 'complete' ? (
        <JobFooter>
          {task.status === 'assigned' ? (
            <>
              <Button
                label="Mark complete"
                fullWidth
                leftIcon="checkmark"
                loading={busy === 'complete'}
                disabled={!!busy}
                onPress={() => changeStatus('complete', true)}
              />
              <Button
                label="Start task"
                variant="outlined"
                color="secondary"
                fullWidth
                loading={busy === 'in_progress'}
                disabled={!!busy}
                onPress={() => changeStatus('in_progress', true)}
              />
            </>
          ) : (
            <Button
              label="Mark complete"
              fullWidth
              leftIcon="checkmark"
              loading={busy === 'complete'}
              disabled={!!busy}
              onPress={() => changeStatus('complete', true)}
            />
          )}
          <Text style={styles.tagline}>
            {`One tap · ${ownerName}'s task dashboard updates in real time`}
          </Text>
        </JobFooter>
      ) : null}
    </View>
  );
};

export default TaskDetailScreen;
