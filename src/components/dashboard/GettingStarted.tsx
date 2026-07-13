import { Fragment } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import type { IconName } from '@/types';

type ChecklistItem = {
  key: string;
  title: string;
  sub: string;
  icon: IconName;
  done?: boolean;
};

const ITEMS: ChecklistItem[] = [
  {
    key: 'account',
    title: 'Account created',
    sub: "You're all set — you're signed in",
    icon: 'checkmark',
    done: true,
  },
  {
    key: 'profile',
    title: 'Complete your profile',
    sub: 'Add your phone, emergency contact & licence',
    icon: 'person-outline',
  },
  {
    key: 'pay',
    title: 'Set your pay & bank details',
    sub: 'So Trayd can pay you correctly',
    icon: 'card-outline',
  },
  {
    key: 'ask',
    title: 'Meet Ask Trayd',
    sub: 'Your assistant for hours, jobs, leave & pay',
    icon: 'sparkles-outline',
  },
];

export const GettingStarted = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>GETTING STARTED</Text>
      <View style={[styles.card, styles.listCard]}>
        {ITEMS.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 ? <View style={styles.rowDivider} /> : null}
            <View style={styles.row}>
              <View style={item.done ? styles.statusDone : styles.statusTodo}>
                <Ionicons
                  name={item.done ? 'checkmark' : item.icon}
                  size={item.done ? 16 : 15}
                  color={item.done ? colors.white : colors.textMuted}
                />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
};

export default GettingStarted;
