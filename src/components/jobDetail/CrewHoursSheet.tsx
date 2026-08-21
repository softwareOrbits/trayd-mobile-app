import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, Input } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDMY, pad } from '@/utils/datetime';
import { firstNameOf } from '@/utils/name';
import { makeJobDetailStyles } from '@/styles/jobDetail.styles';
import type { JobSegment } from '@/services/jobs';

export type CrewHoursEdit = {
  segment: JobSegment;
  startHH: string;
  startMM: string;
  finishHH: string;
  finishMM: string;
  reason: string;
};

const hhmm = (iso: string | null) => {
  if (!iso) return { hh: '', mm: '' };
  const d = new Date(iso);
  return { hh: pad(d.getHours()), mm: pad(d.getMinutes()) };
};

const clockOf = (iso: string | null) => {
  const { hh, mm } = hhmm(iso);
  return hh ? `${hh}:${mm}` : '—';
};

/**
 * Owner-only correction of anyone's logged time on this job. Picking a person
 * lists their entries; editing one writes start/finish and the DB recomputes
 * the hours, keeping the original values for the audit trail.
 */
export const CrewHoursSheet = ({
  visible,
  segments,
  nameOf,
  saving,
  onSave,
  onClose,
}: {
  visible: boolean;
  segments: JobSegment[];
  nameOf: (memberId: string) => string;
  saving: boolean;
  onSave: (edit: CrewHoursEdit) => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeJobDetailStyles);
  const [edit, setEdit] = useState<CrewHoursEdit | null>(null);

  useEffect(() => {
    if (!visible) setEdit(null);
  }, [visible]);

  const openEdit = (segment: JobSegment) => {
    const start = hhmm(segment.startTime);
    const finish = hhmm(segment.finishTime);
    setEdit({
      segment,
      startHH: start.hh,
      startMM: start.mm,
      finishHH: finish.hh,
      finishMM: finish.mm,
      reason: '',
    });
  };

  const patch = (next: Partial<CrewHoursEdit>) =>
    setEdit(prev => (prev ? { ...prev, ...next } : prev));

  const ordered = [...segments].sort((a, b) =>
    b.startTime.localeCompare(a.startTime),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          {edit ? (
            <>
              <Text style={styles.modalTitle}>
                {`${firstNameOf(nameOf(edit.segment.memberId)) || 'Crew'}'s hours`}
              </Text>
              <Text style={styles.modalHint}>
                {`${fmtDMY(edit.segment.startTime)} — the edit is logged against your name.`}
              </Text>

              <Text style={styles.crewHoursLabel}>STARTED</Text>
              <View style={styles.timeRow}>
                <Input
                  keyboardType="number-pad"
                  maxLength={2}
                  value={edit.startHH}
                  onChangeText={v => patch({ startHH: v })}
                  style={styles.timeBox}
                  containerStyle={styles.timeBoxWrap}
                />
                <Text style={styles.timeColon}>:</Text>
                <Input
                  keyboardType="number-pad"
                  maxLength={2}
                  value={edit.startMM}
                  onChangeText={v => patch({ startMM: v })}
                  style={styles.timeBox}
                  containerStyle={styles.timeBoxWrap}
                />
              </View>

              <Text style={styles.crewHoursLabel}>
                {edit.segment.finishTime ? 'FINISHED' : 'STILL ON THE CLOCK'}
              </Text>
              {edit.segment.finishTime ? (
                <View style={styles.timeRow}>
                  <Input
                    keyboardType="number-pad"
                    maxLength={2}
                    value={edit.finishHH}
                    onChangeText={v => patch({ finishHH: v })}
                    style={styles.timeBox}
                    containerStyle={styles.timeBoxWrap}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <Input
                    keyboardType="number-pad"
                    maxLength={2}
                    value={edit.finishMM}
                    onChangeText={v => patch({ finishMM: v })}
                    style={styles.timeBox}
                    containerStyle={styles.timeBoxWrap}
                  />
                </View>
              ) : (
                <Text style={styles.modalHint}>
                  Only the start time can be corrected until they stop.
                </Text>
              )}

              <Input
                label="Reason for edit (optional)"
                placeholder="e.g. Forgot to stop the timer at 17:00."
                value={edit.reason}
                onChangeText={v => patch({ reason: v })}
              />
              <View style={styles.crewHoursBtns}>
                <View style={styles.crewHoursBtn}>
                  <Button
                    label="Back"
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    disabled={saving}
                    onPress={() => setEdit(null)}
                  />
                </View>
                <View style={styles.crewHoursBtn}>
                  <Button
                    label="Save"
                    fullWidth
                    loading={saving}
                    onPress={() => onSave(edit)}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Crew hours</Text>
              <Text style={styles.modalHint}>
                Pick an entry to correct. Every edit keeps the original times.
              </Text>
              <ScrollView style={styles.crewHoursList}>
                {ordered.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nobody has logged time on this job yet.
                  </Text>
                ) : (
                  ordered.map(seg => (
                    <Pressable
                      key={seg.id}
                      style={styles.crewHoursRow}
                      onPress={() => openEdit(seg)}
                    >
                      <View style={styles.crewHoursBody}>
                        <Text style={styles.crewHoursName}>
                          {nameOf(seg.memberId)}
                        </Text>
                        <Text style={styles.crewHoursMeta}>
                          {`${fmtDMY(seg.startTime)} · ${clockOf(
                            seg.startTime,
                          )}–${clockOf(seg.finishTime)}`}
                        </Text>
                      </View>
                      <Text style={styles.crewHoursValue}>
                        {seg.finishTime
                          ? `${(seg.hours ?? 0).toFixed(2)}h`
                          : 'RUNNING'}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CrewHoursSheet;
