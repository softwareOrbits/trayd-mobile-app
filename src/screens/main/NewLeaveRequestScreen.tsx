import { useCallback, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Button, ErrorBoundary, Input } from '@/components/ui';
import { LeaveCalendar, LeaveTypePicker } from '@/components/leave';
import {
  countWorkingDays,
  formatRangeArrow,
} from '@/components/leave/leave.helpers';
import {
  fetchLeaveBalances,
  fetchLeaveTypeOptions,
  submitLeaveRequest,
  type LeaveTypeOption,
} from '@/services/leave';
import { isNetworkError } from '@/utils/errors';
import { withTimeout } from '@/utils/withTimeout';
import { goBackSafe } from '@/utils/navigation';
import { haptics } from '@/utils/haptics';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeNewLeaveStyles } from '@/styles/leave.styles';
import {
  LEAVE_TYPE_LABEL,
  type LeaveBalance,
  type LeaveType,
  type MainStackParamList,
} from '@/types';

const SUBMIT_TIMEOUT_MS = 12_000;

const NewLeaveRequestScreenInner = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNewLeaveStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'NewLeaveRequest'>>();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [typeOptions, setTypeOptions] = useState<LeaveTypeOption[]>([]);
  const [type, setType] = useState<LeaveType>(params?.type ?? 'annual');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchLeaveBalances()
        .then(b => active && setBalances(b))
        .catch(() => {});
      fetchLeaveTypeOptions()
        .then(t => active && setTypeOptions(t))
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []),
  );

  const balance = balances.find(b => b.type === type);
  const entitlement = balance?.entitlement ?? 0;
  const capped = entitlement > 0;
  const noAllocation = type !== 'other' && entitlement === 0;
  const available = balance
    ? Math.max(0, balance.entitlement - balance.used)
    : 0;

  const hasRange = !!(from && to);
  const workingDays = hasRange ? countWorkingDays(from, to) : 0;
  const remaining = Math.max(0, available - workingDays);
  const overspend = capped && hasRange && workingDays > available;

  const submit = () => {
    if (!from || !to || submitting) return;
    if (noAllocation || overspend) {
      haptics.warning();
      const label = LEAVE_TYPE_LABEL[type];
      const message = noAllocation
        ? `You have no allocated ${label} days this year. You can still send this request, but approving it is entirely at your employer’s discretion.`
        : `This request is ${workingDays} working day${
            workingDays === 1 ? '' : 's'
          } but you only have ${available} ${label} day${
            available === 1 ? '' : 's'
          } left. You can still send it, but approving the extra is entirely at your employer’s discretion.`;
      Alert.alert(
        noAllocation ? 'No allocated days' : 'Over your remaining days',
        message,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Submit anyway', onPress: doSubmit },
        ],
      );
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    if (!from || !to || submitting) return;
    setSubmitting(true);
    try {
      await withTimeout(
        submitLeaveRequest({
          type,
          startDate: from,
          endDate: to,
          note: note.trim(),
        }),
        SUBMIT_TIMEOUT_MS,
      );
      goBackSafe(navigation);
      InteractionManager.runAfterInteractions(() => {
        Toast.show({
          type: 'trayd',
          text1: 'Request submitted',
          text2: 'TAP TO VIEW IN TIME OFF',
          props: { eyebrow: 'TRAYD · TIME OFF' },
          visibilityTime: 5000,
        });
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: isNetworkError(e)
          ? 'You’re offline — try again when connected.'
          : e instanceof Error && e.message
            ? e.message
            : 'Could not submit the request.',
      });
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New request</Text>
        <Pressable onPress={() => goBackSafe(navigation)} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.sectionLabel}>TYPE OF LEAVE</Text>
          <LeaveTypePicker
            value={type}
            onChange={setType}
            options={typeOptions}
          />
        </View>

        <View style={styles.banner}>
          {overspend ? (
            <>
              <Ionicons
                name="alert-circle-outline"
                size={26}
                color={colors.warning}
              />
              <Text style={styles.bannerText}>
                Over your {available} remaining day{available === 1 ? '' : 's'} —
                the extra is at your employer’s discretion.
              </Text>
            </>
          ) : capped ? (
            <>
              <Text style={styles.bannerNum}>
                {hasRange ? remaining : available}
              </Text>
              <Text style={styles.bannerText}>
                {hasRange
                  ? `day${remaining === 1 ? '' : 's'} remaining after this request`
                  : `day${available === 1 ? '' : 's'} available this year`}
              </Text>
            </>
          ) : noAllocation ? (
            <>
              <Ionicons
                name="alert-circle-outline"
                size={26}
                color={colors.warning}
              />
              <Text style={styles.bannerText}>
                No allocated days — approval is entirely at your employer’s
                discretion.
              </Text>
            </>
          ) : (
            <>
              <Ionicons
                name="information-circle-outline"
                size={26}
                color={colors.warning}
              />
              <Text style={styles.bannerText}>
                Unpaid — this leave doesn’t use your paid allowance.
              </Text>
            </>
          )}
        </View>

        <View>
          <Text style={styles.sectionLabel}>DATES · TAP START, THEN END</Text>
          <View style={styles.calCard}>
            <LeaveCalendar
              from={from}
              to={to}
              onChange={(f, t) => {
                setFrom(f);
                setTo(t);
              }}
            />
            {hasRange ? (
              <View style={styles.calSummary}>
                <Text style={styles.calSummaryText}>
                  {formatRangeArrow(from, to)}
                </Text>
                <Text style={styles.calSummaryDays}>
                  {workingDays} working day{workingDays === 1 ? '' : 's'}
                </Text>
              </View>
            ) : (
              <Text style={styles.calCaption}>
                Tap a start date, then an end date
              </Text>
            )}
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>NOTE · OPTIONAL</Text>
          <Input
            placeholder="Add context for your manager…"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            style={styles.note}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Submit request"
          fullWidth
          disabled={!hasRange}
          loading={submitting}
          onPress={submit}
        />
        <Text style={styles.footerNote}>
          Your manager gets a push. You’ll be notified of their decision.
        </Text>
      </View>
      <AppToast />
    </View>
  );
};

const NewLeaveRequestScreen = () => (
  <ErrorBoundary title="New request hit a snag">
    <NewLeaveRequestScreenInner />
  </ErrorBoundary>
);

export default NewLeaveRequestScreen;
