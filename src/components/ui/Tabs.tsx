import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { TabsProps } from '@/types';

export const Tabs = ({ tabs, activeKey, onChange }: TabsProps) => {
  const { colors, fonts } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    tabs.findIndex(t => t.key === activeKey),
  );
  const tabWidth = tabs.length > 0 ? width / tabs.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(activeIndex * tabWidth, { duration: 220 });
  }, [activeIndex, tabWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: tabWidth,
  }));

  return (
    <View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      style={styles.container}
    >
      <View style={styles.row}>
        {tabs.map(tab => {
          const isActive = tab.key === activeKey;
          const tint = isActive ? colors.text : colors.textMuted;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.tab}
            >
              {tab.icon ? <Ionicons name={tab.icon} size={16} color={tint} /> : null}
              <Text
                style={[
                  styles.label,
                  {
                    color: tint,
                    fontFamily: isActive ? fonts.bold : fonts.medium,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {tabWidth > 0 ? (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
    },
    row: { flexDirection: 'row' },
    tab: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    label: { fontSize: theme.typography.size.sm },
    indicator: {
      height: 2.5,
      borderRadius: 2,
      position: 'absolute',
      bottom: -1,
      left: 0,
      backgroundColor: theme.colors.secondary,
    },
  });

export default Tabs;
