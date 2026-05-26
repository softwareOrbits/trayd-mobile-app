import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { type Theme } from '@/theme';
import type { JobTabsProps } from '@/types';

export const JobTabs = ({ tabs, activeKey, onChange }: JobTabsProps) => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.row}>
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive ? styles.tabActive : null]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>
              {tab.label}
            </Text>
            <View style={[styles.count, isActive ? styles.countActive : null]}>
              <Text
                style={[
                  styles.countText,
                  isActive ? styles.countTextActive : null,
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: theme.radii.pill,
    },
    tabActive: { backgroundColor: theme.colors.secondary },
    label: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    labelActive: { color: theme.colors.onSecondary },
    count: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countActive: { backgroundColor: theme.colors.primary },
    countText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textMuted,
    },
    countTextActive: { color: theme.colors.onPrimary },
  });

export default JobTabs;
