import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { MONTHS_SHORT } from '@/utils/constants';
import type { TaskPeriod } from '@/types';

const YEAR_SPAN = 10;

type Props = {
  visible: boolean;
  value: TaskPeriod;
  onSelect: (period: TaskPeriod) => void;
  onClose: () => void;
};

export const TaskPeriodPicker = ({ visible, value, onSelect, onClose }: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(value.year);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  useEffect(() => {
    if (visible) {
      setMode('month');
      setYear(value.year);
    }
  }, [visible, value.year]);

  const years = Array.from({ length: YEAR_SPAN }, (_, i) => thisYear - i).reverse();
  const isFutureMonth = (m: number) => year > thisYear || (year === thisYear && m > thisMonth);
  const canStepForward = year < thisYear;

  const chooseMonth = (m: number) => {
    if (isFutureMonth(m)) return;
    onSelect({ year, month: m });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.head}>
            <Text style={styles.title}>
              {mode === 'month' ? 'SELECT A MONTH' : 'SELECT A YEAR'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {mode === 'month' ? (
            <>
              <View style={styles.navRow}>
                <Pressable
                  onPress={() => setYear(y => y - 1)}
                  hitSlop={10}
                  style={styles.navBtn}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.secondary} />
                </Pressable>
                <Pressable onPress={() => setMode('year')} hitSlop={8}>
                  <Text style={styles.navLabel}>{year}</Text>
                </Pressable>
                <Pressable
                  onPress={() => canStepForward && setYear(y => y + 1)}
                  hitSlop={10}
                  style={styles.navBtn}
                  disabled={!canStepForward}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={canStepForward ? colors.secondary : colors.placeholder}
                  />
                </Pressable>
              </View>

              <View style={styles.grid}>
                {MONTHS_SHORT.map((label, m) => {
                  const selected = year === value.year && m === value.month;
                  const disabled = isFutureMonth(m);
                  return (
                    <Pressable
                      key={label}
                      style={styles.cell}
                      onPress={() => chooseMonth(m)}
                      disabled={disabled}
                    >
                      <View style={[styles.pill, selected && styles.pillActive]}>
                        <Text
                          style={[
                            styles.pillText,
                            selected && styles.pillTextActive,
                            disabled && styles.pillTextDisabled,
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.grid}>
              {years.map(y => {
                const selected = y === year;
                return (
                  <Pressable
                    key={y}
                    style={styles.cell}
                    onPress={() => {
                      setYear(y);
                      setMode('month');
                    }}
                  >
                    <View style={[styles.pill, selected && styles.pillActive]}>
                      <Text
                        style={[styles.pillText, selected && styles.pillTextActive]}
                      >
                        {y}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 14,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.4,
      color: theme.colors.textMuted,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    navBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLabel: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '33.3333%',
      paddingVertical: 6,
      alignItems: 'center',
    },
    pill: {
      width: '90%',
      paddingVertical: 12,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    pillActive: {
      backgroundColor: theme.colors.secondary,
      borderColor: theme.colors.secondary,
    },
    pillText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    pillTextActive: { color: theme.colors.white },
    pillTextDisabled: { color: theme.colors.placeholder },
  });

export default TaskPeriodPicker;
