import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobTabsProps } from '@/types';

export const JobTabs = ({ tabs, activeKey, onChange }: JobTabsProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.track}>
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.segment, isActive ? styles.segmentActive : null]}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={isActive ? colors.onSecondary : colors.textMuted}
            />
            {isActive ? (
              <>
                <Text style={styles.labelActive} numberOfLines={1}>
                  {tab.label}
                </Text>
                {tab.count > 0 ? (
                  <View style={styles.count}>
                    <Text style={styles.countText}>{tab.count}</Text>
                  </View>
                ) : null}
              </>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.creamBorder,
    },
    segment: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 36,
      paddingHorizontal: 11,
      borderRadius: theme.radii.pill,
    },
    segmentActive: {
      paddingHorizontal: 14,
      backgroundColor: theme.colors.secondary,
    },
    labelActive: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.onSecondary,
    },
    count: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    countText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onPrimary,
    },
  });

export default JobTabs;
