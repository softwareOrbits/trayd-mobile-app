import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';

export type CountTab = {
  key: string;
  label: string;
  count?: number;
  icon?: IconName;
};

export const CountTabs = ({
  tabs,
  activeKey,
  onChange,
  scrollable = true,
}: {
  tabs: CountTab[];
  activeKey: string;
  onChange: (key: string) => void;
  scrollable?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const row = (
    <View style={styles.row}>
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        const tint = active ? colors.text : colors.textMuted;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tab}
          >
            {tab.icon ? (
              <Ionicons name={tab.icon} size={15} color={tint} />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive, { color: tint }]}>
              {tab.label}
            </Text>
            {tab.count != null ? (
              <View style={[styles.countChip, active && styles.countChipActive]}>
                <Text
                  style={[styles.countText, active && styles.countTextActive]}
                >
                  {tab.count}
                </Text>
              </View>
            ) : null}
            {active ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (!scrollable) return row;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {row}
    </ScrollView>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: { paddingHorizontal: 20 },
    row: { flexDirection: 'row', gap: 20 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    label: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
    },
    labelActive: { fontFamily: theme.fonts.bold },
    countChip: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countChipActive: { backgroundColor: theme.colors.secondary },
    countText: {
      fontSize: 10,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textMuted,
    },
    countTextActive: { color: theme.colors.onSecondary },
    indicator: {
      position: 'absolute',
      bottom: -1,
      left: 0,
      right: 0,
      height: 2.5,
      borderRadius: 2,
      backgroundColor: theme.colors.secondary,
    },
  });

export default CountTabs;
