import { Fragment, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { CalendarModal } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDateFull } from '@/utils/datetime';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type { AskCommitResult, AskField, AskProposal } from '@/types';
import AskOptionSheet from './AskOptionSheet';

type CardState = 'pending' | 'working' | 'done';
type Values = Record<string, unknown>;

const APPROVE_LABEL: Record<string, string> = {
  job: 'Add to Jobs',
  task: 'Add to Tasks',
  public_holiday: 'Add to calendar',
};

const entityKey = (entity: string) => entity.toLowerCase().replace(/\s+/g, '_');

const isBlank = (v: unknown) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const initialValues = (fields: AskField[]): Values =>
  Object.fromEntries(
    fields.map(f => [
      f.key,
      f.value ?? (f.widget === 'toggle' ? false : ''),
    ]),
  );

const displayValue = (field: AskField, value: unknown): string => {
  if (isBlank(value)) return '';
  if (field.widget === 'toggle') return value ? 'Yes' : 'No';
  if (field.widget === 'date') return fmtDateFull(String(value)) ?? String(value);
  return String(value);
};

const toInput = (fields: AskField[], values: Values): Values =>
  Object.fromEntries(
    fields
      .map(f => {
        const v = values[f.key];
        if (isBlank(v)) return null;
        if (f.widget === 'number') {
          const n = Number(String(v).replace(',', '.'));
          return Number.isFinite(n) ? [f.key, n] : null;
        }
        return [f.key, typeof v === 'string' ? v.trim() : v];
      })
      .filter((e): e is [string, unknown] => e !== null),
  );

export const AskDraftCard = ({
  proposal,
  canApprove,
  onApprove,
  onOpen,
}: {
  proposal: AskProposal;
  canApprove: boolean;
  onApprove: (
    proposal: AskProposal,
    input?: Record<string, unknown>,
  ) => Promise<AskCommitResult>;
  onOpen?: (result: AskCommitResult) => { label: string; go: () => void } | null;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const fields = useMemo(() => proposal.fields ?? [], [proposal.fields]);
  const [values, setValues] = useState<Values>(() => initialValues(fields));
  const [state, setState] = useState<CardState>('pending');
  const [result, setResult] = useState<AskCommitResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [picking, setPicking] = useState<AskField | null>(null);
  const [dating, setDating] = useState<AskField | null>(null);
  const inputRef = useRef<TextInput>(null);

  const editable = state === 'pending';
  const set = (key: string, value: unknown) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const missing = fields.filter(f => f.required && isBlank(values[f.key]));
  const ready = canApprove && missing.length === 0;

  const openField = (field: AskField) => {
    if (!editable) return;
    if (field.widget === 'toggle') {
      set(field.key, !values[field.key]);
      return;
    }
    if (field.widget === 'select') {
      setEditing(null);
      setPicking(field);
      return;
    }
    if (field.widget === 'date') {
      setEditing(null);
      setDating(field);
      return;
    }
    setEditing(field.key);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const approve = async () => {
    if (!ready || state !== 'pending') return;
    setEditing(null);
    setState('working');
    const res = await onApprove(
      proposal,
      fields.length ? toInput(fields, values) : undefined,
    );
    if (res.ok) {
      setResult(res);
      setState('done');
    } else {
      setResult(res);
      setState('pending');
    }
  };

  const cancel = () => {
    if (state !== 'pending') return;
    setEditing(null);
    setResult({ ok: false, message: 'Cancelled — nothing was saved.' });
    setState('done');
  };

  if (state === 'done' && result?.ok) {
    const open = onOpen?.(result) ?? null;
    const attached = result.attached
      ? ` · ${result.attached} file${result.attached === 1 ? '' : 's'} attached`
      : '';
    return (
      <View style={styles.draftWrap}>
        <View style={styles.draftCard}>
          <View style={styles.doneBody}>
            <View style={styles.doneTick}>
              <Ionicons name="checkmark" size={26} color="#2F5C45" />
            </View>
            <Text style={styles.doneTitle}>{result.message}</Text>
            <Text style={styles.doneSub}>
              {`Saved to Trayd · ${proposal.entity}${attached}`}
            </Text>
          </View>
        </View>
        {open ? (
          <Pressable style={styles.doneAction} onPress={open.go}>
            <Text style={styles.doneActionText}>{open.label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const rows = fields.length
    ? fields.map(f => ({ field: f, label: f.label, value: values[f.key] }))
    : proposal.details.map(d => ({ field: null, label: d.label, value: d.value }));

  const attachCount = proposal.attachments?.length ?? 0;
  const approveLabel = APPROVE_LABEL[entityKey(proposal.entity)] ?? 'Approve';

  return (
    <View style={styles.draftWrap}>
      {editable && fields.length ? (
        <Text style={styles.draftIntro}>
          Here’s the draft — tap any line to edit it.
        </Text>
      ) : null}

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

        {rows.map((row, i) => {
          const field = row.field;
          const isEditing = !!field && editing === field.key;
          const shown = field
            ? displayValue(field, row.value)
            : String(row.value ?? '');
          const needed = !!field && field.required && isBlank(row.value);
          return (
            <Fragment key={`${row.label}-${i}`}>
              <Pressable
                style={[styles.draftRow, isEditing && styles.draftRowEditing]}
                onPress={() => field && openField(field)}
                disabled={!editable || !field}
              >
                <Text style={styles.draftLabel}>
                  {row.label}
                  {field?.required ? ' *' : ''}
                </Text>
                {isEditing && field ? (
                  <TextInput
                    ref={inputRef}
                    style={styles.draftInput}
                    value={String(row.value ?? '')}
                    onChangeText={text => set(field.key, text)}
                    onBlur={() => setEditing(null)}
                    onSubmitEditing={() => setEditing(null)}
                    keyboardType={field.widget === 'number' ? 'decimal-pad' : 'default'}
                    returnKeyType="done"
                    placeholder={field.label}
                    placeholderTextColor={colors.placeholder}
                  />
                ) : field?.widget === 'toggle' ? (
                  <View style={styles.draftSwitchRow}>
                    <Switch
                      value={!!row.value}
                      onValueChange={v => set(field.key, v)}
                      disabled={!editable}
                      trackColor={{ true: colors.primary, false: '#DDD8CC' }}
                      thumbColor={colors.white}
                    />
                  </View>
                ) : (
                  <Text
                    style={[styles.draftValue, needed && styles.draftValueMissing]}
                    numberOfLines={1}
                  >
                    {needed ? 'Needed' : shown || '—'}
                  </Text>
                )}
                {editable && field && field.widget !== 'toggle' ? (
                  <Ionicons
                    name={field.widget === 'select' ? 'chevron-down' : 'pencil-outline'}
                    size={14}
                    color="#A8AEB8"
                    style={styles.draftPencil}
                  />
                ) : null}
              </Pressable>
              {i < rows.length - 1 ? <View style={styles.draftRowLine} /> : null}
            </Fragment>
          );
        })}

        {attachCount ? (
          <>
            <View style={styles.draftRowLine} />
            <View style={styles.draftRow}>
              <Text style={styles.draftLabel}>Attachments</Text>
              <Text style={styles.draftValue}>
                {`${attachCount} file${attachCount === 1 ? '' : 's'}`}
              </Text>
              <Ionicons
                name="attach"
                size={15}
                color="#A8AEB8"
                style={styles.draftPencil}
              />
            </View>
          </>
        ) : null}
      </View>

      {state === 'done' ? (
        <Text style={styles.draftCancelled}>{result?.message}</Text>
      ) : (
        <>
          {result && !result.ok ? (
            <Text style={[styles.draftCancelled, { color: colors.error }]}>
              {result.message}
            </Text>
          ) : null}
          {canApprove ? (
            <Pressable
              style={[styles.draftPrimary, !ready && styles.draftPrimaryOff]}
              onPress={approve}
              disabled={!ready || state === 'working'}
            >
              {state === 'working' ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.draftPrimaryText}>{approveLabel}</Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.draftOwnerNote}>
              Only the business owner can approve this.
            </Text>
          )}
          <Text style={styles.draftNote}>
            {missing.length && canApprove
              ? `Fill in ${missing.map(f => f.label).join(', ')} to continue.`
              : 'Nothing is saved until you approve.'}
          </Text>
          <Pressable onPress={cancel} hitSlop={8} style={styles.draftCancelBtn}>
            <Text style={styles.draftCancelText}>Cancel</Text>
          </Pressable>
        </>
      )}

      <AskOptionSheet
        field={picking}
        value={picking ? String(values[picking.key] ?? '') : ''}
        onSelect={v => {
          if (picking) set(picking.key, v);
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />

      <CalendarModal
        visible={!!dating}
        value={dating ? (values[dating.key] as string | null) || null : null}
        title={dating?.label}
        onSelect={d => {
          if (dating) set(dating.key, d);
          setDating(null);
        }}
        onClose={() => setDating(null)}
      />
    </View>
  );
};

export default AskDraftCard;
