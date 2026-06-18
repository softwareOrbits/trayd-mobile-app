import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobTabsProps } from '@/types';

export const JobTabs = ({ tabs, activeKey, onChange }: JobTabsProps) => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.track}>
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive ? styles.tabActive : null]}
          >
            <Text
              style={[styles.label, isActive ? styles.labelActive : null]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <View style={[styles.badge, isActive ? styles.badgeActive : null]}>
                <Text
                  style={[
                    styles.count,
                    isActive ? styles.countActive : null,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.creamBorder,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.colors.primary },
    label: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
    labelActive: { color: theme.colors.text },
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeActive: { backgroundColor: theme.colors.primary },
    count: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.textMuted,
    },
    countActive: { color: theme.colors.onPrimary },
  });

export default JobTabs;
