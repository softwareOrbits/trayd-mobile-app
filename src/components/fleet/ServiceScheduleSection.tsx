import { Fragment } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDayShort } from '@/utils/datetime';
import {
  SCHEDULE_STATUS_LABEL,
  intervalText,
  scheduleStatus,
  serviceTypeLabel,
} from '@/utils/serviceSchedule';
import { makeFleetStyles } from '@/styles/fleet.styles';
import type {
  ServiceScheduleItem,
  ServiceScheduleStatus,
  VanMaintenanceEntry,
} from '@/types';

/**
 * The schedule row stores no odometer reading, so the baseline for a mileage
 * based item is the mileage logged on the maintenance entry it was last done on
 * (falling back to the newest entry before that date).
 */
const lastDoneMileage = (
  item: ServiceScheduleItem,
  maintenance: VanMaintenanceEntry[],
): number | null => {
  const doneOn = item.lastDoneOn;
  if (!doneOn) return null;
  const candidates = maintenance
    .filter(m => m.mileageKm != null && m.entryDate <= doneOn)
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  return candidates[0]?.mileageKm ?? null;
};

export const ServiceScheduleSection = ({
  items,
  maintenance,
  odometerKm,
  canManage,
  onAdd,
}: {
  items: ServiceScheduleItem[];
  maintenance: VanMaintenanceEntry[];
  odometerKm: number | null;
  canManage: boolean;
  onAdd: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);

  const chipStyle: Record<ServiceScheduleStatus, StyleProp<ViewStyle>> = {
    overdue: [styles.badge, styles.badgeRed],
    due_soon: [styles.badge],
    ok: [styles.badge, styles.badgeGreen],
    unknown: [styles.badge, styles.badgeNeutral],
  };
  const chipTextStyle: Record<ServiceScheduleStatus, StyleProp<TextStyle>> = {
    overdue: [styles.badgeText, styles.badgeRedText],
    due_soon: [styles.badgeText],
    ok: [styles.badgeText, styles.badgeGreenText],
    unknown: [styles.badgeText, styles.badgeNeutralText],
  };

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>
          {`SERVICE SCHEDULE · ${items.length}`}
        </Text>
        {canManage ? (
          <Pressable style={styles.sectionAction} onPress={onAdd} hitSlop={8}>
            <Ionicons name="add" size={15} color={colors.secondary} />
            <Text style={styles.sectionActionText}>ADD ITEM</Text>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptySection}>
          {canManage
            ? 'Nothing scheduled yet — add the first service item.'
            : 'No service schedule set for this van yet.'}
        </Text>
      ) : (
        <View style={styles.scheduleCard}>
          {items.map((item, i) => {
            const status = scheduleStatus(
              item,
              odometerKm,
              lastDoneMileage(item, maintenance),
            );
            const meta = [
              serviceTypeLabel(item.serviceType),
              intervalText(item),
              item.nextDueOn ? `Next due ${fmtDayShort(item.nextDueOn)}` : null,
              item.lastDoneOn ? `Last done ${fmtDayShort(item.lastDoneOn)}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Fragment key={item.id}>
                {i > 0 ? <View style={styles.historyDivider} /> : null}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleTopRow}>
                    <Text style={styles.scheduleName} numberOfLines={2}>
                      {item.itemName}
                    </Text>
                    <View style={chipStyle[status]}>
                      <Text style={chipTextStyle[status]}>
                        {SCHEDULE_STATUS_LABEL[status]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.scheduleMeta}>{meta}</Text>
                  {item.notes ? (
                    <Text style={styles.scheduleNotes} numberOfLines={3}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>
              </Fragment>
            );
          })}
        </View>
      )}
    </>
  );
};

export default ServiceScheduleSection;
