import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type { AskCommitResult, AskProposal } from '@/types';

type CardState = 'pending' | 'working' | 'done';

export const AskApprovalCard = ({
  proposal,
  onApprove,
}: {
  proposal: AskProposal;
  onApprove: (proposal: AskProposal) => Promise<AskCommitResult>;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const [state, setState] = useState<CardState>('pending');
  const [result, setResult] = useState<AskCommitResult | null>(null);

  const approve = async () => {
    if (state !== 'pending') return;
    setState('working');
    const res = await onApprove(proposal);
    setResult(res);
    setState('done');
  };

  const cancel = () => {
    if (state !== 'pending') return;
    setResult({ ok: false, message: 'Cancelled — nothing was saved.' });
    setState('done');
  };

  return (
    <View style={[styles.apprCard, state === 'done' && styles.apprCardDone]}>
      <View style={styles.apprHead}>
        <View style={styles.apprTag}>
          <Text style={styles.apprTagText}>
            {proposal.entity.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.apprSummary}>{proposal.summary}</Text>
      </View>

      {proposal.details?.map((detail, i) => (
        <Fragment key={`${detail.label}-${i}`}>
          <View style={styles.divider} />
          <View style={styles.apprRow}>
            <Text style={styles.apprLabel}>{detail.label}</Text>
            <Text style={styles.apprValue}>{detail.value}</Text>
          </View>
        </Fragment>
      ))}

      {state === 'done' ? (
        <View style={styles.apprStatusRow}>
          <Ionicons
            name={result?.ok ? 'checkmark-circle' : 'close-circle'}
            size={16}
            color={result?.ok ? colors.green : colors.textMuted}
          />
          <Text
            style={[
              styles.apprStatus,
              result?.ok ? styles.apprStatusOk : styles.apprStatusOff,
            ]}
          >
            {result?.message}
          </Text>
        </View>
      ) : (
        <View style={styles.apprActions}>
          <Pressable
            style={[styles.apprBtn, styles.apprCancel]}
            onPress={cancel}
            disabled={state !== 'pending'}
          >
            <Text style={styles.apprCancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.apprBtn, styles.apprApprove]}
            onPress={approve}
            disabled={state !== 'pending'}
          >
            {state === 'working' ? (
              <ActivityIndicator size="small" color={colors.onSecondary} />
            ) : (
              <Text style={styles.apprApproveText}>Approve</Text>
            )}
          </Pressable>
        </View>
      )}

      {state === 'pending' ? (
        <Text style={styles.apprHint}>Nothing is saved until you approve.</Text>
      ) : null}
    </View>
  );
};

export default AskApprovalCard;
