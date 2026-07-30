import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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

import { Button, CalendarModal } from '@/components/ui';
import { TaskAvatar } from '@/components/tasks';
import { createTask, fetchAssignableEmployees } from '@/services/tasks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { HALF_HOUR_TIME_OPTIONS } from '@/utils/constants';
import { fmtDateWeekday } from '@/utils/datetime';
import { firstNameOf } from '@/utils/name';
import { toastError } from '@/utils/toast';
import { makeAssignTaskStyles } from '@/styles/assignTask.styles';
import type { AssignableEmployee, MainStackParamList } from '@/types';

const AssignTaskScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAssignTaskStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const header = (
    <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.secondary} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerEyebrow}>TASK MANAGEMENT</Text>
        <Text style={styles.headerTitle}>Assign a task</Text>
      </View>
      <View style={styles.headerSpacer} />
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

  const canAssign = !!assignee && !!title.trim() && !!date && !saving;

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
            {` is now on ${selected.name ?? 'their'}'s task list, due ${fmtDateWeekday(
              date as string,
            )}. They’ve had a push notification.`}
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

  return (
    <View style={styles.flex}>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>ASSIGN TO</Text>
        {employees === null ? (
          <ActivityIndicator color={colors.secondary} style={styles.loading} />
        ) : employees.length === 0 ? (
          <Text style={styles.emptyEmployees}>
            No employees to assign to yet.
          </Text>
        ) : (
          <View style={styles.employeeList}>
            {employees.map(emp => {
              const on = emp.id === assignee;
              return (
                <Pressable
                  key={emp.id}
                  style={[styles.employee, on && styles.employeeOn]}
                  onPress={() => setAssignee(emp.id)}
                >
                  <TaskAvatar name={emp.name} size={38} />
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>
                      {emp.name ?? 'Employee'}
                    </Text>
                    {emp.roleName ? (
                      <Text style={styles.employeeRole}>{emp.roleName}</Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={on ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={on ? colors.primary : colors.placeholder}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>TASK TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Collect conduit & trunking"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any detail they’ll need on the way"
          placeholderTextColor={colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>DEADLINE</Text>
        <View style={styles.deadlineRow}>
          <Pressable
            style={[styles.pill, styles.pillGrow]}
            onPress={() => setDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={17} color={colors.secondary} />
            <Text style={date ? styles.pillValue : styles.pillPlaceholder}>
              {date ? fmtDateWeekday(date) : 'Pick a date'}
            </Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => setTimeSheet(true)}>
            <Ionicons name="time-outline" size={17} color={colors.secondary} />
            <Text style={time ? styles.pillValue : styles.pillPlaceholder}>
              {time ?? 'Any time'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>LOCATION · OPTIONAL</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Heat Merchants · Raheen"
          placeholderTextColor={colors.placeholder}
          value={address}
          onChangeText={setAddress}
        />
      </ScrollView>

      <View style={styles.footer}>
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
      </View>

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
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Deadline time</Text>
            <ScrollView style={styles.sheetList}>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  setTime(null);
                  setTimeSheet(false);
                }}
              >
                <Text style={styles.sheetRowText}>Any time</Text>
                {time === null ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
              {HALF_HOUR_TIME_OPTIONS.map(t => (
                <Pressable
                  key={t}
                  style={styles.sheetRow}
                  onPress={() => {
                    setTime(t);
                    setTimeSheet(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sheetRowText,
                      t === time && styles.sheetRowActive,
                    ]}
                  >
                    {t}
                  </Text>
                  {t === time ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AssignTaskScreen;
