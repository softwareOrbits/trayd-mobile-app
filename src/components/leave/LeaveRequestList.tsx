import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { StatusPill, type StatusTone } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveBodyStyles } from '@/styles/leave.styles';
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL_LONG,
  type LeaveRequest,
  type LeaveStatus,
} from '@/types';
import {
  LEAVE_GROUP_LABEL,
  formatDay,
  formatRange,
  formatShort,
  groupRequests,
} from './leave.helpers';

type LeaveRequestListProps = {
  requests: LeaveRequest[];
  onPressRequest?: (request: LeaveRequest) => void;
};

const STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  closed: 'neutral',
};

const STATUS_VERB: Record<LeaveStatus, string> = {
  approved: 'Approved',
  pending: 'Requested',
  rejected: 'Rejected',
  closed: 'Closed',
};

export const LeaveRequestList = ({
  requests,
  onPressRequest,
}: LeaveRequestListProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveBodyStyles);

  if (requests.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons name="sunny-outline" size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No time-off requests yet</Text>
        <Text style={styles.emptyText}>
          Your full allowance is ready to use. Tap “Request time off” to book
          annual, sick, casual or other leave.
        </Text>
      </View>
    );
  }

  const accentFor = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return colors.green;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
      default:
        return colors.borderMuted;
    }
  };

  const metaFor = (r: LeaveRequest) => {
    if (r.status === 'pending') {
      return `Awaiting approval · sent ${formatDay(r.createdAt)}`;
    }
    if (r.decidedBy) {
      const when = r.decidedAt ? ` · ${formatShort(r.decidedAt)}` : '';
      return `${STATUS_VERB[r.status]} by ${r.decidedBy}${when}`;
    }
    if (r.status === 'approved') {
      return `Approved automatically · ${formatShort(r.decidedAt ?? r.createdAt)}`;
    }
    return null;
  };

  const groups = groupRequests(requests);

  return (
    <>
      {groups.map(group => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupLabel}>
            {LEAVE_GROUP_LABEL[group.key]}
            {group.key === 'pending' ? ` · ${group.requests.length}` : ''}
          </Text>
          <View style={styles.card}>
            {group.requests.map((r, index) => {
              const meta = metaFor(r);
              return (
                <Fragment key={r.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <Pressable
                    style={styles.row}
                    disabled={!onPressRequest}
                    onPress={() => onPressRequest?.(r)}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: accentFor(r.status) },
                      ]}
                    />
                    <View style={styles.rowBody}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {LEAVE_TYPE_LABEL_LONG[r.type]}
                          <Text style={styles.rowTitleDays}>
                            {'  '}
                            {r.days} day{r.days === 1 ? '' : 's'}
                          </Text>
                        </Text>
                        <View style={styles.rowRight}>
                          <StatusPill
                            label={LEAVE_STATUS_LABEL[r.status]}
                            tone={STATUS_TONE[r.status]}
                          />
                          <Ionicons
                            name="chevron-forward"
                            size={15}
                            color={colors.placeholder}
                          />
                        </View>
                      </View>
                      <Text style={styles.rowDate}>
                        {formatRange(r.startDate, r.endDate)}
                      </Text>
                      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
                      {r.note && r.status !== 'pending' ? (
                        <Text
                          style={[
                            styles.rowNote,
                            r.status === 'rejected' && styles.rowNoteRejected,
                          ]}
                        >
                          “{r.note}”
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </View>
      ))}
    </>
  );
};

export default LeaveRequestList;
