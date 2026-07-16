import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, ErrorBoundary, StatusPill, type StatusTone } from '@/components/ui';
import {
  formatDay,
  formatRangeArrow,
  formatShort,
} from '@/components/leave/leave.helpers';
import { canCancelRequest, cancelLeaveRequest } from '@/services/leave';
import { goBackSafe } from '@/utils/navigation';
import { haptics } from '@/utils/haptics';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeLeaveDetailStyles } from '@/styles/leave.styles';
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL_LONG,
  type LeaveStatus,
  type MainStackParamList,
} from '@/types';

const STATUS_TONE: Record<LeaveStatus, StatusTone> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  closed: 'neutral',
};

const LeaveRequestDetailScreenInner = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeLeaveDetailStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'LeaveRequestDetail'>>();
  const request = params.request;

  const [cancelling, setCancelling] = useState(false);

  const accent =
    request.status === 'approved'
      ? colors.green
      : request.status === 'pending'
      ? colors.warning
      : request.status === 'rejected'
      ? colors.error
      : colors.borderMuted;

  const meta =
    request.status === 'pending'
      ? `Awaiting approval · sent ${formatDay(request.createdAt)}`
      : request.decidedBy
      ? `${LEAVE_STATUS_LABEL[request.status]} by ${request.decidedBy}${
          request.decidedAt ? ` · ${formatShort(request.decidedAt)}` : ''
        }`
      : request.status === 'approved'
      ? `Approved automatically · ${formatShort(
          request.decidedAt ?? request.createdAt,
        )}`
      : null;

  const ownNote = request.ownNote ?? request.note;
  const declineReason =
    request.status === 'rejected'
      ? request.decisionNote ?? request.note
      : request.decisionNote;

  const detailRows = [
    { label: 'Type', value: LEAVE_TYPE_LABEL_LONG[request.type] },
    { label: 'Dates', value: formatRangeArrow(request.startDate, request.endDate) },
    {
      label: 'Working days',
      value: `${request.days} day${request.days === 1 ? '' : 's'}`,
    },
    { label: 'Requested', value: formatDay(request.createdAt) },
    ...(request.decidedAt
      ? [{ label: 'Decided', value: formatDay(request.decidedAt) }]
      : []),
    ...(request.decidedBy
      ? [{ label: 'Decided by', value: request.decidedBy }]
      : []),
  ];

  const confirmCancel = () => {
    haptics.warning();
    Alert.alert(
      'Cancel this request?',
      `${LEAVE_TYPE_LABEL_LONG[request.type]} · ${formatRangeArrow(
        request.startDate,
        request.endDate,
      )}`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => {
            setCancelling(true);
            cancelLeaveRequest(request.id)
              .then(() => {
                goBackSafe(navigation);
                Toast.show({
                  type: 'trayd',
                  text1: 'Request cancelled',
                  props: { eyebrow: 'TRAYD · TIME OFF' },
                });
              })
              .catch(e => {
                setCancelling(false);
                Toast.show({
                  type: 'error',
                  text1:
                    e instanceof Error && e.message
                      ? e.message
                      : 'Could not cancel the request.',
                });
              });
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => goBackSafe(navigation)}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Request details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryTypeRow}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text style={styles.summaryType} numberOfLines={1}>
                {LEAVE_TYPE_LABEL_LONG[request.type]}
              </Text>
            </View>
            <StatusPill
              label={LEAVE_STATUS_LABEL[request.status]}
              tone={STATUS_TONE[request.status]}
            />
          </View>
          <Text style={styles.summaryDates}>
            {formatRangeArrow(request.startDate, request.endDate)}
          </Text>
          {meta ? <Text style={styles.summaryMeta}>{meta}</Text> : null}
        </View>

        <View>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          <View style={styles.detailCard}>
            {detailRows.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.detailRow,
                  i < detailRows.length - 1 && styles.detailDivider,
                ]}
              >
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {ownNote ? (
          <View>
            <Text style={styles.sectionLabel}>YOUR NOTE</Text>
            <View style={styles.card}>
              <Text style={styles.noteText}>“{ownNote}”</Text>
            </View>
          </View>
        ) : null}

        {declineReason && declineReason !== ownNote ? (
          <View>
            <Text style={styles.sectionLabel}>
              {request.status === 'rejected' ? 'DECLINE REASON' : 'MANAGER’S NOTE'}
            </Text>
            <View
              style={[
                styles.card,
                request.status === 'rejected' && styles.declineCard,
              ]}
            >
              <Text
                style={[
                  styles.noteText,
                  request.status === 'rejected' && styles.declineText,
                ]}
              >
                “{declineReason}”
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {canCancelRequest(request) ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            accessibilityRole="button"
            style={styles.cancelBtn}
            disabled={cancelling}
            onPress={confirmCancel}
          >
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.cancelBtnText}>
              {cancelling ? 'Cancelling…' : 'Cancel request'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <AppToast />
    </View>
  );
};

const LeaveRequestDetailScreen = () => (
  <ErrorBoundary title="Request details hit a snag">
    <LeaveRequestDetailScreenInner />
  </ErrorBoundary>
);

export default LeaveRequestDetailScreen;
