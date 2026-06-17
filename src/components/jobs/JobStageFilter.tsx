import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { JobTabKey } from '@/types';

export type JobStageKey = 'scheduled' | 'live' | 'done';

export type JobStageSub = {
  key: JobTabKey;
  label: string;
  count: number;
};

export type JobStage = {
  key: JobStageKey;
  label: string;
  count: number;
  subs: JobStageSub[];
};

type Props = {
  stages: JobStage[];
  activeStage: JobStageKey;
  activeSub: JobTabKey;
  onSelectStage: (stage: JobStageKey) => void;
  onSelectSub: (sub: JobTabKey) => void;
};

export const JobStageFilter = ({
  stages,
  activeStage,
  activeSub,
  onSelectStage,
  onSelectSub,
}: Props) => {
  const styles = useThemedStyles(makeStyles);
  const current = stages.find(s => s.key === activeStage);
  const subs = current?.subs ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.segment}>
        {stages.map(stage => {
          const active = stage.key === activeStage;
          return (
            <Pressable
              key={stage.key}
              style={[styles.seg, active && styles.segActive]}
              onPress={() => onSelectStage(stage.key)}
            >
              <Text
                numberOfLines={1}
                style={[styles.segLabel, active && styles.segLabelActive]}
              >
                {stage.label}
              </Text>
              <Text style={[styles.segCount, active && styles.segCountActive]}>
                {stage.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {subs.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subRow}
        >
          {subs.map(sub => {
            const active = sub.key === activeSub;
            return (
              <Pressable
                key={sub.key}
                style={styles.subChip}
                onPress={() => onSelectSub(sub.key)}
              >
                <Text style={[styles.subLabel, active && styles.subLabelActive]}>
                  {sub.label}
                </Text>
                <View style={[styles.subCount, active && styles.subCountActive]}>
                  <Text
                    style={[
                      styles.subCountText,
                      active && styles.subCountTextActive,
                    ]}
                  >
                    {sub.count}
                  </Text>
                </View>
                {active ? <View style={styles.subUnderline} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { gap: 8 },

    segment: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.pill,
      padding: 4,
      gap: 4,
    },
    seg: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: theme.radii.pill,
    },
    segActive: { backgroundColor: theme.colors.secondary },
    segLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    segLabelActive: { color: theme.colors.onSecondary },
    segCount: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textMuted,
    },
    segCountActive: { color: theme.colors.primary },

    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 22,
      paddingHorizontal: 8,
      paddingRight: 24,
    },
    subChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingBottom: 8,
      paddingTop: 2,
    },
    subLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    subLabelActive: { color: theme.colors.text },
    subCount: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    subCountActive: { backgroundColor: theme.colors.primary },
    subCountText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textMuted,
    },
    subCountTextActive: { color: theme.colors.onPrimary },
    subUnderline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.primary,
    },
  });

export default JobStageFilter;
