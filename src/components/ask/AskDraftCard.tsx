import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type { AskCommitResult, AskProposal, AskProposalDetail } from '@/types';

type CardState = 'pending' | 'working' | 'done';

export const AskDraftCard = ({
  proposal,
  onApprove,
  onEditRequest,
}: {
  proposal: AskProposal;
  onApprove: (proposal: AskProposal) => Promise<AskCommitResult>;
  onEditRequest?: (detail: AskProposalDetail) => void;
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

  if (state === 'done' && result?.ok) {
    return (
      <View style={styles.draftCard}>
        <View style={styles.doneBody}>
          <View style={styles.doneTick}>
            <Ionicons name="checkmark" size={26} color="#2F5C45" />
          </View>
          <Text style={styles.doneTitle}>{result.message}</Text>
          <Text style={styles.doneSub}>
            {`Saved to Trayd · ${proposal.entity}`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.draftWrap}>
      <View style={styles.draftCard}>
        <View style={styles.draftHead}>
          <Text style={styles.draftHeadText} numberOfLines={1}>
            {proposal.entity.toUpperCase()}
          </Text>
          <View
            style={[styles.draftChip, state === 'done' && styles.draftChipOff]}
          >
            <Text
              style={[
                styles.draftChipText,
                state === 'done' && styles.draftChipTextOff,
              ]}
            >
              {state === 'done' ? 'CANCELLED' : 'DRAFT'}
            </Text>
          </View>
        </View>

        {proposal.summary ? (
          <>
            <Text style={styles.draftSummary}>{proposal.summary}</Text>
            <View style={styles.draftRowLine} />
          </>
        ) : null}

        {proposal.details?.map((detail, i) => (
          <Fragment key={`${detail.label}-${i}`}>
            <Pressable
              style={styles.draftRow}
              onPress={() => onEditRequest?.(detail)}
              disabled={state !== 'pending' || !onEditRequest}
            >
              <Text style={styles.draftLabel}>{detail.label}</Text>
              <Text style={styles.draftValue} numberOfLines={1}>
                {detail.value}
              </Text>
              {state === 'pending' && onEditRequest ? (
                <Ionicons
                  name="pencil-outline"
                  size={14}
                  color="#A8AEB8"
                  style={styles.draftPencil}
                />
              ) : null}
            </Pressable>
            {i < proposal.details.length - 1 ? (
              <View style={styles.draftRowLine} />
            ) : null}
          </Fragment>
        ))}
      </View>

      {state === 'done' ? (
        <Text style={styles.draftCancelled}>{result?.message}</Text>
      ) : (
        <>
          <Pressable
            style={styles.draftPrimary}
            onPress={approve}
            disabled={state !== 'pending'}
          >
            {state === 'working' ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.draftPrimaryText}>Approve</Text>
            )}
          </Pressable>
          <Pressable onPress={cancel} hitSlop={8} style={styles.draftCancelBtn}>
            <Text style={styles.draftCancelText}>Cancel</Text>
          </Pressable>
        </>
      )}
    </View>
  );
};

export default AskDraftCard;
