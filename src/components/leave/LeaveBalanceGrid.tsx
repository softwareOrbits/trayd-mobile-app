import { Text, View } from 'react-native';

import { useTheme, type AppColors } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveHeaderStyles } from '@/styles/leave.styles';
import {
  LEAVE_BALANCE_FRAMING,
  LEAVE_TYPE_CAPTION,
  LEAVE_TYPE_LABEL,
  type LeaveBalance,
  type LeaveType,
} from '@/types';

type LeaveBalanceGridProps = {
  balances: LeaveBalance[];
};

const accentFor = (type: LeaveType, colors: AppColors) => {
  switch (type) {
    case 'annual':
      return colors.primary;
    case 'sick':
      return colors.warning;
    case 'casual':
      return colors.green;
    default:
      return colors.primary;
  }
};

const describe = (balance: LeaveBalance) => {
  const framing = LEAVE_BALANCE_FRAMING[balance.type];
  const capped = balance.entitlement > 0;
  const committed = balance.used + balance.pending;
  const progress = capped ? Math.min(1, committed / balance.entitlement) : 0;
  const note = balance.pending ? `${balance.pending} pending` : null;

  if (framing === 'used') {
    return {
      value: balance.used,
      caption: `of ${balance.entitlement} used`,
      progress,
      showBar: capped,
      note,
    };
  }
  if (framing === 'taken') {
    return {
      value: balance.used,
      caption: 'days taken',
      progress: 0,
      showBar: false,
      note,
    };
  }
  return {
    value: Math.max(0, balance.entitlement - committed),
    caption: `of ${balance.entitlement} left`,
    progress,
    showBar: capped,
    note,
  };
};

export const LeaveBalanceGrid = ({ balances }: LeaveBalanceGridProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveHeaderStyles);

  return (
    <View style={styles.grid}>
      {balances.map(balance => {
        const d = describe(balance);
        const navy = balance.type === 'annual';
        const accent = navy
          ? colors.primary
          : accentFor(balance.type, colors);
        const subCaption = LEAVE_TYPE_CAPTION[balance.type];

        return (
          <View
            key={balance.type}
            style={[styles.card, navy && styles.cardNavy]}
          >
            <Text style={[styles.cardLabel, navy && styles.cardLabelOnNavy]}>
              {LEAVE_TYPE_LABEL[balance.type].toUpperCase()} · {balance.year}
            </Text>
            <View style={styles.cardValueRow}>
              <Text style={[styles.cardValue, navy && styles.cardValueOnNavy]}>
                {d.value}
              </Text>
              <Text
                style={[styles.cardCaption, navy && styles.cardCaptionOnNavy]}
              >
                {d.caption}
              </Text>
            </View>
            {d.note ? (
              <Text
                style={[
                  styles.cardSubCaption,
                  navy && styles.cardSubCaptionOnNavy,
                ]}
              >
                {d.note}
              </Text>
            ) : null}
            {d.showBar ? (
              <View style={[styles.cardTrack, navy && styles.cardTrackOnNavy]}>
                <View
                  style={[
                    styles.cardFill,
                    { width: `${d.progress * 100}%`, backgroundColor: accent },
                  ]}
                />
              </View>
            ) : subCaption ? (
              <Text
                style={[
                  styles.cardSubCaption,
                  navy && styles.cardSubCaptionOnNavy,
                ]}
              >
                {subCaption}
              </Text>
            ) : (
              <View
                style={[styles.cardTrack, navy && styles.cardTrackOnNavy]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

export default LeaveBalanceGrid;
