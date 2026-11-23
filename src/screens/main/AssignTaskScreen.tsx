import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, CalendarModal, JobFooter } from '@/components/ui';
import { TaskAvatar } from '@/components/tasks';
import { createTask, fetchAssignableEmployees } from '@/services/tasks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { HALF_HOUR_TIME_OPTIONS } from '@/utils/constants';
import { fmtDateWeekday } from '@/utils/datetime';
import { firstNameOf } from '@/utils/name';
import { toastError } from '@/utils/toast';
import { makeAssignTaskStyles } from '@/styles/assignTask.styles';
import { makeNewJobStyles } from '@/styles/newJob.styles';
import type { AssignableEmployee, MainStackParamList } from '@/types';

const AssignTaskScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAssignTaskStyles);
  const n = useThemedStyles(makeNewJobStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const header = (
    <View style={[n.top, { paddingTop: insets.top + 12 }]}>
      <Pressable
        style={n.back}
        onPress={() => navigation.goBack()}
        hitSlop={8}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={colors.secondary} />
      </Pressable>
      <Text style={n.topTitle}>New task</Text>
    </View>
  );

  const [employees, setEmployees] = useState<AssignableEmployee[] | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [datePicker, setDatePicker] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAssignableEmployees()
      .then(rows => active && setEmployees(rows))
      .catch(e => {
        if (active) setEmployees([]);
        toastError(e, 'Could not load your team.');
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => employees?.find(e => e.id === assignee) ?? null,
    [employees, assignee],
  );

  const why = !assignee
    ? 'Pick who it’s for.'
    : !title.trim()
      ? 'Add a task title.'
      : !date
        ? 'Pick a deadline date.'
        : null;
  const canAssign = !why && !saving;

  const assign = async () => {
    if (!canAssign || !assignee || !date) return;
    setSaving(true);
    try {
      await createTask({
        title,
        description: description || null,
        assignedTo: assignee,
        deadlineDate: date,
        deadlineTime: time,
        address: address || null,
        eircode: null,
      });
      setDone(true);
    } catch (e) {
      toastError(e, 'Could not assign the task.');
    } finally {
      setSaving(false);
    }
  };

  if (done && selected) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.successBody}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={34} color={colors.green} />
          </View>
          <Text style={styles.successTitle}>Task assigned</Text>
          <Text style={styles.successText}>
            <Text style={styles.successStrong}>{title.trim()}</Text>
            {` is on ${firstNameOf(selected.name) || 'their'}’s task list.`}
          </Text>

          <View style={styles.assigneeCard}>
            <TaskAvatar name={selected.name} size={34} />
            <View style={styles.assigneeInfo}>
              <Text style={styles.assigneeName}>{selected.name ?? 'Employee'}</Text>
              <Text style={styles.assigneeMeta}>
                {`ASSIGNED · DUE ${fmtDateWeekday(date as string).toUpperCase()}${
                  time ? ` · ${time}` : ''
                }`}
              </Text>
            </View>
          </View>

          <Button
            label="Back to tasks"
            fullWidth
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  const label = (text: string, extra?: string, first?: boolean) => (
    <Text style={[n.label, first && n.labelFirst]}>
      {text}
      {extra ? <Text style={n.labelExtra}>{` · ${extra}`}</Text> : null}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      style={n.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {header}

      <ScrollView
        style={n.flex}
        contentContainerStyle={[
          n.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {label('Assign to', undefined, true)}
        {employees === null ? (
          <ActivityIndicator color={colors.secondary} style={n.loader} />
        ) : employees.length === 0 ? (
          <Text style={n.hint}>No employees to assign to yet.</Text>
        ) : (
          <View style={n.pchips}>
            {employees.map(emp => {
              const on = emp.id === assignee;
              const name = emp.name ?? 'Employee';
              return (
                <Pressable
                  key={emp.id}
                  style={[n.pchip, on && n.pchipOn]}
                  onPress={() => setAssignee(on ? null : emp.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[n.pav, on && n.pavOn]}>
                    <Text style={[n.pavText, on && n.pavTextOn]}>
                      {name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[n.pchipText, on && n.pchipTextOn]}>
                    {firstNameOf(name) || name}
                  </Text>
                  {on ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {label('Task title')}
        <View style={n.gap8}>
          <TextInput
            style={n.input}
            placeholder="e.g. Collect conduit & trunking"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {label('Description', 'optional')}
        <View style={n.gap8}>
          <TextInput
            style={[n.input, n.textArea]}
            placeholder="Any detail they’ll need on the way"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {label('Deadline')}
        <View style={[n.pills2, n.pillsTight]}>
          <Pressable
            style={[n.pillbtn, n.pillWide]}
            onPress={() => setDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.secondary}
            />
            <Text
              style={date ? n.pillValue : n.pillPlaceholder}
              numberOfLines={1}
            >
              {date ? fmtDateWeekday(date) : 'Date *'}
            </Text>
          </Pressable>
          <Pressable
            style={[n.pillbtn, n.pillNarrow]}
            onPress={() => setTimeSheet(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.secondary} />
            <Text style={time ? n.pillValue : n.pillPlaceholder}>
              {time ? `By ${time}` : 'Any time'}
            </Text>
          </Pressable>
        </View>

        {label('Location', 'optional')}
        <View style={n.gap8}>
          <TextInput
            style={n.input}
            placeholder="e.g. Heat Merchants · Raheen"
            placeholderTextColor={colors.placeholder}
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </ScrollView>

      <JobFooter>
        {why ? <Text style={n.why}>{why}</Text> : null}
        <Button
          label={
            selected
              ? `Assign to ${firstNameOf(selected.name) || 'them'}`
              : 'Assign task'
          }
          leftIcon="flash"
          fullWidth
          loading={saving}
          disabled={!canAssign}
          onPress={assign}
        />
      </JobFooter>

      <CalendarModal
        visible={datePicker}
        value={date}
        title="Deadline"
        onSelect={d => {
          setDate(d);
          setDatePicker(false);
        }}
        onClose={() => setDatePicker(false)}
      />

      <Modal
        visible={timeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeSheet(false)}
      >
        <View style={n.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={[n.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={n.grab} />
            <Text style={n.sheetTitle}>Due by</Text>
            <ScrollView>
              <View style={n.times}>
                {[null, ...HALF_HOUR_TIME_OPTIONS].map(t => {
                  const on = t === time;
                  return (
                    <Pressable
                      key={t ?? 'any'}
                      style={[n.timeBtn, !t && n.timeBtnWide, on && n.timeBtnOn]}
                      onPress={() => {
                        setTime(t);
                        setTimeSheet(false);
                      }}
                    >
                      <Text style={[n.timeText, on && n.timeTextOn]}>
                        {t ?? 'Any time'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default AssignTaskScreen;
