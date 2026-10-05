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
import { toastError } from '@/utils/toast';
import AskOptionSheet from './AskOptionSheet';
import InvoicePdfWebView from './InvoicePdfWebView';

type CardState = 'pending' | 'working' | 'done';
type Values = Record<string, unknown>;
type Row = Record<string, unknown>;

type Target = { field: AskField; parentKey?: string; row?: number };

const APPROVE_LABEL: Record<string, string> = {
  job: 'Add to Jobs',
  task: 'Add to Tasks',
  public_holiday: 'Add to calendar',
};

const entityKey = (entity: string) => entity.toLowerCase().replace(/\s+/g, '_');

const isBlank = (v: unknown) =>
  v === null ||
  v === undefined ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

const blankFor = (field: AskField): unknown => {
  if (field.widget === 'toggle') return false;
  if (field.widget === 'multiselect' || field.widget === 'lines') return [];
  return '';
};

const initialValue = (field: AskField): unknown => {
  if (field.widget === 'lines' || field.widget === 'multiselect') {
    return Array.isArray(field.value) ? field.value : [];
  }
  return field.value ?? blankFor(field);
};

const initialValues = (fields: AskField[]): Values =>
  Object.fromEntries(fields.map(f => [f.key, initialValue(f)]));

const emptyRow = (columns: AskField[]): Row =>
  Object.fromEntries(columns.map(c => [c.key, c.value ?? blankFor(c)]));

const rowIsEmpty = (columns: AskField[], row: Row) =>
  columns.every(c => c.widget === 'toggle' || isBlank(row[c.key]));

const displayValue = (field: AskField, value: unknown): string => {
  if (isBlank(value)) return '';
  if (field.widget === 'toggle') return value ? 'Yes' : 'No';
  if (field.widget === 'date') return fmtDateFull(String(value)) ?? String(value);
  if (field.widget === 'multiselect' && Array.isArray(value)) return value.join(', ');
  return String(value);
};

const cleanValue = (field: AskField, v: unknown): unknown => {
  if (isBlank(v)) return undefined;
  if (field.widget === 'number') {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  }
  return typeof v === 'string' ? v.trim() : v;
};

const cleanRow = (columns: AskField[], row: Row): Row =>
  Object.fromEntries(
    columns
      .map(c => [c.key, cleanValue(c, row[c.key])] as const)
      .filter(([, v]) => v !== undefined),
  );

const filledRows = (field: AskField, value: unknown): Row[] => {
  const columns = field.columns ?? [];
  return (Array.isArray(value) ? (value as Row[]) : []).filter(
    r => !rowIsEmpty(columns, r),
  );
};

const toInput = (fields: AskField[], values: Values): Values => {
  const out: Values = {};
  for (const f of fields) {
    const v = values[f.key];
    if (f.widget === 'lines') {
      const rows = filledRows(f, v).map(r => cleanRow(f.columns ?? [], r));
      if (rows.length) out[f.key] = rows;
      continue;
    }
    const cleaned = cleanValue(f, v);
    if (cleaned !== undefined) out[f.key] = cleaned;
  }
  return out;
};

const missingLabels = (fields: AskField[], values: Values): string[] =>
  fields.flatMap(f => {
    if (f.widget !== 'lines') {
      return f.required && isBlank(values[f.key]) ? [f.label] : [];
    }
    const rows = filledRows(f, values[f.key]);
    if (f.required && !rows.length) return [f.label];
    return rows.flatMap((r, i) =>
      (f.columns ?? [])
        .filter(c => c.required && isBlank(r[c.key]))
        .map(c => `${f.label} ${i + 1} ${c.label.toLowerCase()}`),
    );
  });

export const AskDraftCard = ({
  proposal,
  onApprove,
  onOpen,
}: {
  proposal: AskProposal;
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
  const [picking, setPicking] = useState<Target | null>(null);
  const [dating, setDating] = useState<Target | null>(null);
  const inputRef = useRef<TextInput>(null);
  const [downloading, setDownloading] = useState(false);
  const editable = state === 'pending';

  const rowsOf = (key: string): Row[] =>
    Array.isArray(values[key]) ? (values[key] as Row[]) : [];

  const getValue = (t: Target): unknown =>
    t.parentKey != null && t.row != null
      ? rowsOf(t.parentKey)[t.row]?.[t.field.key]
      : values[t.field.key];

  const setValue = (t: Target, value: unknown) =>
    setValues(prev => {
      if (t.parentKey == null || t.row == null) {
        return { ...prev, [t.field.key]: value };
      }
      const rows = [...((prev[t.parentKey] as Row[] | undefined) ?? [])];
      rows[t.row] = { ...rows[t.row], [t.field.key]: value };
      return { ...prev, [t.parentKey]: rows };
    });

  const addRow = (field: AskField) =>
    setValues(prev => ({
      ...prev,
      [field.key]: [...rowsOf(field.key), emptyRow(field.columns ?? [])],
    }));

  const removeRow = (field: AskField, index: number) =>
    setValues(prev => ({
      ...prev,
      [field.key]: rowsOf(field.key).filter((_, i) => i !== index),
    }));

  const missing = missingLabels(fields, values);
  const ready = missing.length === 0;

  const multiSelected = (t: Target | null): string[] | undefined => {
    if (!t || t.field.widget !== 'multiselect') return undefined;
    const v = getValue(t);
    return Array.isArray(v) ? (v as string[]) : [];
  };

  const pick = (t: Target, option: string) => {
    if (t.field.widget === 'multiselect') {
      const current = multiSelected(t) ?? [];
      setValue(
        t,
        current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      );
      setPicking({ ...t });
      return;
    }
    setValue(t, option);
    setPicking(null);
  };

  const openField = (t: Target) => {
    if (!editable) return;
    const { widget } = t.field;
    if (widget === 'toggle') {
      setValue(t, !getValue(t));
      return;
    }
    if (widget === 'select' || widget === 'multiselect') {
      setEditing(null);
      setPicking(t);
      return;
    }
    if (widget === 'date') {
      setEditing(null);
      setDating(t);
      return;
    }
    setEditing(t.field.key);
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
    setResult(res);
    setState(res.ok ? 'done' : 'pending');
  };

  const cancel = () => {
    if (state !== 'pending') return;
    setEditing(null);
    setResult({ ok: false, message: 'Cancelled — nothing was saved.' });
    setState('done');
  };

  if (state === 'done' && result?.ok) {
    const open = onOpen?.(result) ?? null;
    const invoiceId =
      result.document?.type === 'invoice' ? result.document.id : null;
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
        {invoiceId ? (
          <Pressable
            style={styles.draftPrimary}
            onPress={() => setDownloading(true)}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.draftPrimaryText}>Download PDF</Text>
            )}
          </Pressable>
        ) : null}
        {invoiceId && downloading ? (
          <InvoicePdfWebView
            invoiceId={invoiceId}
            onDone={() => setDownloading(false)}
            onError={message => {
              setDownloading(false);
              toastError(new Error(message), message);
            }}
          />
        ) : null}
        {open ? (
          <Pressable style={styles.doneAction} onPress={open.go}>
            <Text style={styles.doneActionText}>{open.label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const renderCell = (column: AskField, parent: AskField, rowIndex: number) => {
    const t: Target = { field: column, parentKey: parent.key, row: rowIndex };
    const value = getValue(t);
    const needed = column.required && isBlank(value);
    if (column.widget === 'text' || column.widget === 'number') {
      return (
        <View key={column.key} style={styles.lineCell}>
          <Text style={styles.draftLabel}>
            {column.label}
            {column.required ? ' *' : ''}
          </Text>
          <TextInput
            style={styles.draftInput}
            value={String(value ?? '')}
            onChangeText={text => setValue(t, text)}
            editable={editable}
            keyboardType={column.widget === 'number' ? 'decimal-pad' : 'default'}
            placeholder={needed ? 'Needed' : '—'}
            placeholderTextColor={needed ? '#B4541A' : colors.placeholder}
          />
        </View>
      );
    }
    return (
      <Pressable
        key={column.key}
        style={styles.lineCell}
        onPress={() => openField(t)}
        disabled={!editable}
      >
        <Text style={styles.draftLabel}>
          {column.label}
          {column.required ? ' *' : ''}
        </Text>
        {column.widget === 'toggle' ? (
          <View style={styles.draftSwitchRow}>
            <Switch
              value={!!value}
              onValueChange={v => setValue(t, v)}
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
            {needed ? 'Needed' : displayValue(column, value) || '—'}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderLines = (field: AskField) => {
    const rows = rowsOf(field.key);
    const columns = field.columns ?? [];
    return (
      <View style={styles.lineSection}>
        <View style={styles.lineHead}>
          <Text style={styles.draftLabel}>
            {field.label}
            {field.required ? ' *' : ''}
          </Text>
          <Text style={styles.draftLabel}>{`${rows.length}`}</Text>
        </View>
        {rows.map((_, index) => (
          <View key={`${field.key}-${index}`} style={styles.lineCard}>
            <View style={styles.lineCardHead}>
              <Text style={styles.lineCardTitle}>{`LINE ${index + 1}`}</Text>
              {editable ? (
                <Pressable onPress={() => removeRow(field, index)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            {columns.map(column => renderCell(column, field, index))}
          </View>
        ))}
        {editable ? (
          <Pressable style={styles.lineAdd} onPress={() => addRow(field)}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={styles.lineAddText}>Add line</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const items = fields.length
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

        {items.map((item, i) => {
          const field = item.field;
          const divider =
            i < items.length - 1 ? <View style={styles.draftRowLine} /> : null;
          if (field?.widget === 'lines') {
            return (
              <Fragment key={`${item.label}-${i}`}>
                {renderLines(field)}
                {divider}
              </Fragment>
            );
          }
          const isEditing = !!field && editing === field.key;
          const shown = field
            ? displayValue(field, item.value)
            : String(item.value ?? '');
          const needed = !!field && field.required && isBlank(item.value);
          return (
            <Fragment key={`${item.label}-${i}`}>
              <Pressable
                style={[styles.draftRow, isEditing && styles.draftRowEditing]}
                onPress={() => field && openField({ field })}
                disabled={!editable || !field}
              >
                <Text style={styles.draftLabel}>
                  {item.label}
                  {field?.required ? ' *' : ''}
                </Text>
                {isEditing && field ? (
                  <TextInput
                    ref={inputRef}
                    style={styles.draftInput}
                    value={String(item.value ?? '')}
                    onChangeText={text => setValue({ field }, text)}
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
                      value={!!item.value}
                      onValueChange={v => setValue({ field }, v)}
                      disabled={!editable}
                      trackColor={{ true: colors.primary, false: '#DDD8CC' }}
                      thumbColor={colors.white}
                    />
                  </View>
                ) : field?.widget === 'multiselect' &&
                  Array.isArray(item.value) &&
                  item.value.length ? (
                  <View style={styles.multiChips}>
                    {(item.value as string[]).map(name => (
                      <View key={name} style={styles.multiChip}>
                        <Text
                          style={styles.multiChipText}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {name}
                        </Text>
                      </View>
                    ))}
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
                    name={
                      field.widget === 'select' || field.widget === 'multiselect'
                        ? 'chevron-down'
                        : 'pencil-outline'
                    }
                    size={14}
                    color="#A8AEB8"
                    style={styles.draftPencil}
                  />
                ) : null}
              </Pressable>
              {divider}
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
          <Text style={styles.draftNote}>
            {missing.length
              ? `Fill in ${missing.join(', ')} to continue.`
              : 'Nothing is saved until you approve.'}
          </Text>
          <Pressable onPress={cancel} hitSlop={8} style={styles.draftCancelBtn}>
            <Text style={styles.draftCancelText}>Cancel</Text>
          </Pressable>
        </>
      )}

      <AskOptionSheet
        field={picking?.field ?? null}
        value={picking ? String(getValue(picking) ?? '') : ''}
        selected={multiSelected(picking)}
        onSelect={v => {
          if (picking) pick(picking, v);
        }}
        onClose={() => setPicking(null)}
      />

      <CalendarModal
        visible={!!dating}
        value={dating ? (getValue(dating) as string | null) || null : null}
        title={dating?.field.label}
        onSelect={d => {
          if (dating) setValue(dating, d);
          setDating(null);
        }}
        onClose={() => setDating(null)}
      />
    </View>
  );
};

export default AskDraftCard;
