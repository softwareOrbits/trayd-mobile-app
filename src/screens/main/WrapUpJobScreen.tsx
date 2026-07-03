import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { Button, Input, JobFooter, JobHeader } from '@/components/ui';
import { PhotoStrip } from '@/components/jobDetail';
import { MaterialSheet } from '@/components/jobDetail/DetailModals';
import { type SelectedMaterial } from '@/components/MaterialSelect';
import { WizardScaffold } from '@/components/wizard';
import {
  addJobPhotos,
  confirmJobMaterials,
  editSegmentFinishTime,
  editSegmentStartTime,
  fetchAssignmentRates,
  fetchDefaultVatRate,
  fetchJobDetail,
  fetchJobMaterials,
  fetchJobNotes,
  fetchJobPhotos,
  fetchJobSegments,
  finishJob,
  humaniseLifecycle,
  isAccessRevoked,
  pauseJob,
  type JobMaterial,
  type JobNote,
  type JobSegment,
} from '@/services/jobs';
import { enqueueAction, queueFinish } from '@/services/outbox';
import { enqueue, offlineActionBlocked } from '@/offline';
import {
  addMaterial as addMaterialOffline,
  editMaterial as editMaterialOffline,
  removeMaterial as removeMaterialOffline,
} from '@/offline/materialActions';
import { loadJobCache, saveJobCache } from '@/services/jobCache';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs, patchJobStatus } from '@/store/jobsSlice';
import { setPendingJobStatus } from '@/store/pendingJobsSlice';
import { signOut } from '@/store/authSlice';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeWrapUpStyles } from '@/styles/wrapUp.styles';
import { capturePhoto } from '@/utils/capturePhoto';
import { isNetworkError } from '@/utils/errors';
import { goBackSafe } from '@/utils/navigation';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  WRAP_UP_TOTAL,
  SUMMARY_CHIPS,
  two,
  fmtClock,
  fmtMoney,
  fmtDateLong,
  diffLabelFor,
  fmtHoursMin,
} from '@/components/wrapUp/helpers';
import type { JobDetail, JobTabKey, MainStackParamList } from '@/types';

const TOTAL = WRAP_UP_TOTAL;

const WrapUpJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeWrapUpStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'WrapUpJob'>>();
  const dispatch = useAppDispatch();

  const resetToJobsTab = useCallback(
    (initialTab: JobTabKey) =>
      navigation.reset({
        index: 0,
        routes: [
          { name: 'Tabs', params: { screen: 'Jobs', params: { initialTab } } },
        ],
      }),
    [navigation],
  );

  const [step, setStep] = useState(1);
  const [result, setResult] = useState<'success' | 'offline' | null>(null);
  // Multi-day jobs open on the "today or tomorrow?" decision; others skip it.
  const [phase, setPhase] = useState<'decision' | 'wizard'>('wizard');
  const [pausing, setPausing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  // Loaded data
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [segments, setSegments] = useState<JobSegment[]>([]);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [rates, setRates] = useState<Map<string, number>>(new Map());
  const [vatRate, setVatRate] = useState(0);
  const [afterPhotos, setAfterPhotos] = useState<
    { id: string; uri: string; time: string | null }[]
  >([]);
  const [refPhotos, setRefPhotos] = useState<
    { id: string; uri: string; label: string }[]
  >([]);
  const [photoCounts, setPhotoCounts] = useState({ beforeMid: 0, after: 0 });
  const [notes, setNotes] = useState<JobNote[]>([]);

  const [matSheet, setMatSheet] = useState<'new' | string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState<string | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    if (!result) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      resetToJobsTab('done');
      return true;
    });
    return () => sub.remove();
  }, [result, resetToJobsTab]);

  // Step 1 — start & finish times
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [finishDate, setFinishDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<'start' | 'finish'>('finish');
  const [editHH, setEditHH] = useState('00');
  const [editMM, setEditMM] = useState('00');
  const [editReason, setEditReason] = useState('');
  const [timeEdited, setTimeEdited] = useState(false);
  const [startEdited, setStartEdited] = useState(false);
  // Editor: days to shift the date, and which quick-preset is active.
  const [editDayOffset, setEditDayOffset] = useState(0);
  const [activePreset, setActivePreset] = useState<
    'down5' | 'down15' | 'now' | null
  >(null);

  // Steps 2–5
  const [capturing, setCapturing] = useState(false);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finalHours, setFinalHours] = useState(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const openSegment = useMemo(
    () => segments.find(s => s.finishTime == null) ?? null,
    [segments],
  );

  const loadAfterPhotos = useCallback(async (jobId: string) => {
    try {
      const all = await fetchJobPhotos(jobId);
      const fmtT = (iso: string | null) =>
        iso
          ? new Date(iso).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;
      setAfterPhotos(
        all
          .filter(p => p.phase === 'after' && p.url)
          .map(p => ({ id: p.id, uri: p.url as string, time: fmtT(p.takenAt) })),
      );
      setRefPhotos(
        all
          .filter(p => p.phase !== 'after' && p.url)
          .map(p => ({
            id: p.id,
            uri: p.url as string,
            label: p.phase === 'during' ? 'MID' : 'BEFORE',
          })),
      );
      setPhotoCounts({
        beforeMid: all.filter(p => p.phase !== 'after').length,
        after: all.filter(p => p.phase === 'after').length,
      });
    } catch (e) {
      console.warn('after photos:', e instanceof Error ? e.message : e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hydrate = (
      d: JobDetail,
      segs: JobSegment[],
      mats: JobMaterial[],
      rateMap: Map<string, number>,
      vat: number,
      jobNotes: JobNote[],
    ) => {
      setDetail(d);
      setNotes(jobNotes);
      if (
        (d.jobType === 'standard' || d.jobType === 'multi_day') &&
        d.status === 'active'
      ) {
        setPhase('decision');
      }
      setSegments(segs);
      setMaterials(mats);
      setRates(rateMap);
      setVatRate(vat);
      setFinishDate(new Date());
      const earliest = segs.reduce<string | null>(
        (min, s) => (!min || s.startTime < min ? s.startTime : min),
        null,
      );
      if (earliest) setStartDate(new Date(earliest));
    };

    (async () => {
      try {
        const [d, segs, mats, rateMap, vat, jobNotes] = await Promise.all([
          fetchJobDetail(params.jobId),
          fetchJobSegments(params.jobId),
          fetchJobMaterials(params.jobId),
          fetchAssignmentRates(params.jobId).catch(() => new Map()),
          fetchDefaultVatRate().catch(() => 0),
          fetchJobNotes(params.jobId).catch(() => [] as JobNote[]),
        ]);
        if (!active) return;
        hydrate(d, segs, mats, rateMap, vat, jobNotes);
        saveJobCache(params.jobId, {
          detail: d,
          segments: segs,
          materials: mats,
          rates: [...rateMap],
          vat,
          notes: jobNotes,
        });
      } catch (e) {
        if (!isNetworkError(e)) {
          toastError(e, 'Could not load the job.');
          goBackSafe(navigation);
          return;
        }
        const cached = await loadJobCache(params.jobId);
        if (!active) return;
        if (!cached?.detail || !cached.segments) {
          goBackSafe(navigation);
          return;
        }
        hydrate(
          cached.detail,
          cached.segments,
          cached.materials ?? [],
          new Map(cached.rates ?? []),
          cached.vat ?? 0,
          cached.notes ?? [],
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    loadAfterPhotos(params.jobId);
    return () => {
      active = false;
    };
  }, [params.jobId, navigation, loadAfterPhotos]);

  // Tick the live total on step 1 while the clock is still open & unedited.
  useEffect(() => {
    if (step !== 1 || editing || timeEdited || !openSegment) return;
    const id = setInterval(() => {
      setNow(Date.now());
      setFinishDate(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, [step, editing, timeEdited, openSegment]);

  const cutoffMs = finishDate ? finishDate.getTime() : now;

  const hours = useMemo(() => {
    let h = 0;
    for (const s of segments) {
      if (s.finishTime == null) {
        h += Math.max(0, (cutoffMs - new Date(s.startTime).getTime()) / 3_600_000);
      } else {
        h += s.hours ?? 0;
      }
    }
    return h;
  }, [segments, cutoffMs]);

  const labour = useMemo(() => {
    let l = 0;
    for (const s of segments) {
      const rate = rates.get(s.memberId) ?? 0;
      const h =
        s.finishTime == null
          ? Math.max(0, (cutoffMs - new Date(s.startTime).getTime()) / 3_600_000)
          : s.hours ?? 0;
      l += h * rate;
    }
    return l;
  }, [segments, rates, cutoffMs]);

  const materialsTotal = useMemo(
    () => materials.reduce((s, m) => s + m.quantity * m.unitCost, 0),
    [materials],
  );

  const subtotal = labour + materialsTotal;
  const vatAmount = subtotal * (vatRate / 100);
  const draftTotal = subtotal + vatAmount;

  // Total shown on step 1 reflects the (possibly edited) start→finish span so
  // editing either time updates it live; labour above stays segment-based.
  const spanHours =
    startDate && finishDate
      ? Math.max(0, (finishDate.getTime() - startDate.getTime()) / 3_600_000)
      : hours;

  // ----- Step 1: time edit (start or finish) -----
  const baseFor = (target: 'start' | 'finish') =>
    target === 'start' ? startDate : finishDate;

  const openEditor = (target: 'start' | 'finish') => {
    const d = baseFor(target) ?? new Date();
    setEditTarget(target);
    setEditHH(two(d.getHours()));
    setEditMM(two(d.getMinutes()));
    setEditReason('');
    setEditDayOffset(0);
    setActivePreset(null);
    setEditing(true);
  };

  const switchTarget = (target: 'start' | 'finish') => {
    const d = baseFor(target) ?? new Date();
    setEditTarget(target);
    setEditHH(two(d.getHours()));
    setEditMM(two(d.getMinutes()));
    setEditDayOffset(0);
    setActivePreset(null);
  };

  // Build a Date on the target day (plus any offset) from the editor HH:MM.
  const editedDate = () => {
    const d = new Date(baseFor(editTarget) ?? Date.now());
    d.setDate(d.getDate() + editDayOffset);
    d.setHours(
      Math.min(23, Math.max(0, parseInt(editHH, 10) || 0)),
      Math.min(59, Math.max(0, parseInt(editMM, 10) || 0)),
      0,
      0,
    );
    return d;
  };

  // Manual HH/MM edits clear the active preset highlight.
  const onEditHH = (v: string) => {
    setEditHH(v);
    setActivePreset(null);
  };
  const onEditMM = (v: string) => {
    setEditMM(v);
    setActivePreset(null);
  };

  const applyPreset = (kind: 'down5' | 'down15' | 'now') => {
    const d = kind === 'now' ? new Date() : editedDate();
    if (kind === 'down5') {
      d.setMinutes(d.getMinutes() - (d.getMinutes() % 5), 0, 0);
    } else if (kind === 'down15') {
      d.setMinutes(d.getMinutes() - (d.getMinutes() % 15), 0, 0);
    }
    setEditHH(two(d.getHours()));
    setEditMM(two(d.getMinutes()));
    setActivePreset(kind);
  };

  const saveTimeEdit = () => {
    const d = editedDate();
    if (editTarget === 'finish') {
      if (startDate && d.getTime() < startDate.getTime()) {
        Toast.show({ type: 'error', text1: 'Finish is before the start.' });
        return;
      }
      if (d.getTime() > Date.now() + 5 * 60_000) {
        Toast.show({ type: 'error', text1: 'That time is in the future.' });
        return;
      }
      setFinishDate(d);
      setTimeEdited(true);
    } else {
      if (finishDate && d.getTime() > finishDate.getTime()) {
        Toast.show({ type: 'error', text1: 'Start is after the finish.' });
        return;
      }
      setStartDate(d);
      setStartEdited(true);
    }
    setEditing(false);
  };

  // ----- Step 2: after photos -----
  const addAfterPhoto = async () => {
    if (capturing) return;
    if (offlineActionBlocked()) return;
    const asset = await capturePhoto({ quality: 0.7, maxSize: 1600 });
    if (!asset) return;
    setCapturing(true);
    const stamp = Date.now();
    const items = [
      {
        phase: 'after' as const,
        uri: asset.uri,
        base64: asset.base64,
        type: asset.type,
        clientKey: `${params.jobId}-${stamp}`,
      },
    ];
    const queueOffline = async () => {
      await enqueue({
        id: `${params.jobId}:photos:${stamp}`,
        kind: 'job.addPhotos',
        payload: {
          clientId: `${params.jobId}-${stamp}`,
          jobId: params.jobId,
          photos: items,
        },
      });
      setAfterPhotos(prev => [
        ...prev,
        { id: items[0].clientKey, uri: asset.uri, time: fmtClock(new Date()) },
      ]);
      setPhotoCounts(prev => ({ ...prev, after: prev.after + 1 }));
      toastSuccess('Saved offline — photo uploads when you reconnect.');
    };
    try {
      const { uploaded } = await addJobPhotos({
        jobId: params.jobId,
        photos: items,
      });
      if (!uploaded) {
        await queueOffline();
        return;
      }
      await loadAfterPhotos(params.jobId);
    } catch (e) {
      if (isNetworkError(e)) {
        await queueOffline();
      } else {
        toastError(e, 'Could not upload the photo.');
      }
    } finally {
      setCapturing(false);
    }
  };

  const openNewMaterial = () => {
    setItemName('');
    setItemUnit(null);
    setItemQty('1');
    setItemCost('');
    setMatSheet('new');
  };

  const openEditMaterial = (m: JobMaterial) => {
    setItemName(m.description);
    setItemUnit(m.unit);
    setItemQty(String(m.quantity));
    setItemCost(m.unitCost ? String(m.unitCost) : '');
    setMatSheet(m.id);
  };

  const onPickMaterial = (m: SelectedMaterial) => {
    setItemName(m.name);
    setItemUnit(m.unit);
    if (m.sellPrice != null) setItemCost(String(m.sellPrice));
  };

  const saveMaterial = async () => {
    if (!detail || !itemName.trim() || !matSheet || savingItem) return;
    if (offlineActionBlocked()) return;
    setSavingItem(true);
    const qty = Math.max(1, parseFloat(itemQty.replace(',', '.')) || 1);
    const cost = parseFloat(itemCost.replace(',', '.')) || 0;
    try {
      if (matSheet === 'new') {
        const { queued, material } = await addMaterialOffline({
          jobId: detail.id,
          description: itemName.trim(),
          quantity: qty,
          unitCost: cost,
          unit: itemUnit,
          source: 'van_stock',
        });
        if (queued) {
          const next = [...materials, material];
          setMaterials(next);
          saveJobCache(detail.id, { materials: next });
        } else {
          setMaterials(await fetchJobMaterials(detail.id));
        }
        setMatSheet(null);
        toastSuccess(
          queued ? 'Saved offline — syncs when you’re back online.' : 'Item logged.',
        );
      } else {
        const editedId = matSheet;
        const { queued } = await editMaterialOffline(editedId, {
          description: itemName.trim(),
          quantity: qty,
          unitCost: cost,
        });
        if (queued) {
          const next = materials.map(m =>
            m.id === editedId
              ? { ...m, description: itemName.trim(), quantity: qty, unitCost: cost }
              : m,
          );
          setMaterials(next);
          saveJobCache(detail.id, { materials: next });
        } else {
          setMaterials(await fetchJobMaterials(detail.id));
        }
        setMatSheet(null);
        toastSuccess(
          queued ? 'Saved offline — syncs when you’re back online.' : 'Item updated.',
        );
      }
    } catch (e) {
      toastError(e, 'Could not save the item.');
    } finally {
      setSavingItem(false);
    }
  };

  const removeMaterial = async () => {
    if (!detail || matSheet === 'new' || !matSheet || savingItem) return;
    if (offlineActionBlocked()) return;
    setSavingItem(true);
    const removedId = matSheet;
    try {
      const { queued } = await removeMaterialOffline(removedId);
      if (queued) {
        const next = materials.filter(m => m.id !== removedId);
        setMaterials(next);
        saveJobCache(detail.id, { materials: next });
      } else {
        setMaterials(await fetchJobMaterials(detail.id));
      }
      setMatSheet(null);
      toastSuccess(
        queued ? 'Saved offline — syncs when you’re back online.' : 'Item removed.',
      );
    } catch (e) {
      toastError(e, 'Could not remove the item.');
    } finally {
      setSavingItem(false);
    }
  };

  const toggleChip = (phrase: string) =>
    setSummary(prev =>
      prev.trim() ? `${prev.trimEnd()}\n${phrase}.` : `${phrase}.`,
    );

  // ----- Step 5: submit -----
  const submit = async () => {
    if (submitting || !finishDate) return;
    if (offlineActionBlocked()) return;
    setSubmitting(true);
    const finishIso = finishDate.toISOString();
    const reason = editReason.trim() || null;
    const startIso = startEdited && startDate ? startDate.toISOString() : null;
    const earliest = startIso
      ? segments.reduce<JobSegment | null>(
          (min, s) => (!min || s.startTime < min.startTime ? s : min),
          null,
        )
      : null;
    try {
      await confirmJobMaterials(params.jobId).catch(() => {});
      const warnEdit = (err: unknown) =>
        console.warn('segment edit:', err instanceof Error ? err.message : err);
      if (earliest && startIso) {
        await editSegmentStartTime(earliest.id, startIso, reason).catch(warnEdit);
      }
      if (timeEdited && openSegment) {
        await editSegmentFinishTime(openSegment.id, finishIso, reason).catch(
          warnEdit,
        );
      }
      const total = await finishJob({
        jobId: params.jobId,
        summary,
        totalHours: null,
        atIso: finishIso,
      });
      setFinalHours(total || hours);
      dispatch(fetchJobs());
      setSubmittedAt(fmtClock(new Date()));
      setResult('success');
    } catch (e) {
      if (isNetworkError(e)) {
        await enqueue({
          id: `${params.jobId}:confirmMaterials:${finishIso}`,
          kind: 'job.confirmMaterials',
          payload: { jobId: params.jobId },
        });
        if (earliest && startIso) {
          await enqueue({
            id: `${earliest.id}:editStart:${finishIso}`,
            kind: 'segment.edit',
            payload: {
              jobId: params.jobId,
              entryId: earliest.id,
              startIso,
              reason,
            },
          });
        }
        await queueFinish({
          jobId: params.jobId,
          summary: summary.trim() || null,
          totalHours: null,
          atIso: finishIso,
        });
        dispatch(patchJobStatus({ id: params.jobId, status: 'awaiting_review' }));
        dispatch(
          setPendingJobStatus({ id: params.jobId, status: 'awaiting_review' }),
        );
        if (detail) {
          saveJobCache(params.jobId, {
            detail: { ...detail, status: 'awaiting_review' },
          });
        }
        setFinalHours(hours);
        setSubmittedAt(fmtClock(new Date()));
        setResult('offline');
      } else if (isAccessRevoked(e)) {
        dispatch(signOut());
      } else {
        Toast.show({
          type: 'error',
          text1:
            e instanceof Error ? humaniseLifecycle(e.message) : 'Submit failed.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // "Continue tomorrow" — pause (same RPC as End day, mds §1). Job stays open.
  const continueTomorrow = async () => {
    if (pausing) return;
    if (offlineActionBlocked()) return;
    setPausing(true);
    const atIso = new Date().toISOString();
    try {
      await pauseJob(params.jobId, atIso);
      dispatch(fetchJobs());
      toastSuccess('Paused — see you tomorrow.');
      resetToJobsTab('resume');
    } catch (e) {
      if (isNetworkError(e)) {
        await enqueueAction({
          id: `${params.jobId}:pause:${atIso}`,
          jobId: params.jobId,
          kind: 'pause',
          atIso,
        });
        dispatch(patchJobStatus({ id: params.jobId, status: 'paused' }));
        dispatch(setPendingJobStatus({ id: params.jobId, status: 'paused' }));
        if (detail) {
          saveJobCache(params.jobId, {
            detail: { ...detail, status: 'paused' },
          });
        }
        Toast.show({ type: 'info', text1: 'Saved offline — will sync.' });
        resetToJobsTab('resume');
      } else if (isAccessRevoked(e)) {
        dispatch(signOut());
      } else {
        Toast.show({
          type: 'error',
          text1: e instanceof Error ? humaniseLifecycle(e.message) : 'Could not pause.',
        });
      }
    } finally {
      setPausing(false);
    }
  };

  const onBack = () => {
    if (editing) return setEditing(false);
    if (step > 1) return setStep(s => s - 1);
    navigation.goBack();
  };

  // ---------------- Result screens ----------------
  if (result) {
    const success = result === 'success';
    const owner = detail?.createdByName ?? 'Your office';
    return (
      <View style={styles.flex}>
        <JobHeader
          title=""
          onBack={() => resetToJobsTab('done')}
          right={<Text style={styles.resultLogo}>TRAYD</Text>}
        />

        <View style={styles.resultBody}>
          <View
            style={[
              styles.resultIcon,
              { backgroundColor: success ? colors.primary : colors.surfaceMuted },
            ]}
          >
            <Ionicons
              name={success ? 'checkmark' : 'cloud-offline-outline'}
              size={40}
              color={success ? colors.onPrimary : colors.textMuted}
            />
          </View>

          <Text style={styles.resultEyebrow}>
            {success
              ? `SUBMITTED${submittedAt ? ` · ${submittedAt}` : ''}`
              : `SAVED OFFLINE${submittedAt ? ` · ${submittedAt}` : ''}`}
          </Text>
          <Text style={styles.resultTitle}>
            {success ? 'Good work. 👋' : 'Saved on your phone.'}
          </Text>
          <Text style={styles.resultText}>
            {success
              ? `${owner} has been notified. You’ll get a push when the invoice is approved.`
              : 'Nothing to do — Trayd will send this automatically when signal returns.'}
          </Text>

          <View style={styles.resultCard}>
            <View style={styles.resultCardHead}>
              <Text style={styles.resultCardName} numberOfLines={1}>
                {(detail?.customerName ?? 'Job').toUpperCase()}
              </Text>
              <View style={styles.reviewBadge}>
                <Text style={styles.reviewBadgeText}>
                  {success ? 'AWAITING REVIEW' : 'WAITING TO SYNC'}
                </Text>
              </View>
            </View>
            <Text style={styles.resultCardStat}>
              {`${fmtHoursMin(finalHours)} · ${fmtMoney(materialsTotal)} materials`}
            </Text>
          </View>
        </View>

        <JobFooter>
          <Button
            label="Back to jobs"
            fullWidth
            onPress={() => resetToJobsTab('done')}
          />
          {success ? (
            <Pressable
              onPress={() =>
                navigation.reset({
                  index: 1,
                  routes: [{ name: 'Tabs' }, { name: 'StartJob' }],
                })
              }
              hitSlop={8}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Start another job</Text>
            </Pressable>
          ) : null}
        </JobFooter>
      </View>
    );
  }

  if (loading || !detail) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  // ---------------- Multi-day decision screen ----------------
  if (phase === 'decision') {
    // Current day's portion (mds §5.5): segments/materials tagged to the day.
    const dayIds = Array.from(
      new Set(segments.map(s => s.jobDayId).filter(Boolean)),
    );
    const currentDayId =
      openSegment?.jobDayId ?? dayIds[dayIds.length - 1] ?? null;
    const dayHours = currentDayId
      ? segments
          .filter(s => s.jobDayId === currentDayId)
          .reduce((sum, s) => {
            if (s.finishTime == null) {
              return sum + Math.max(0, (now - new Date(s.startTime).getTime()) / 3_600_000);
            }
            return sum + (s.hours ?? 0);
          }, 0)
      : hours;
    const dayMats = currentDayId
      ? materials
          .filter(m => m.jobDayId === currentDayId)
          .reduce((sum, m) => sum + m.quantity * m.unitCost, 0)
      : materialsTotal;
    const dayNumber = Math.max(1, dayIds.length || 1);

    return (
      <View style={styles.flex}>
        <JobHeader title="Wrapping up" onBack={() => navigation.goBack()} />

        <View style={styles.decisionBody}>
          <Text style={styles.decisionEyebrow}>
            {(detail.customerName ?? 'JOB').toUpperCase()}
          </Text>
          <Text style={styles.decisionTitle}>
            Finishing today, or back tomorrow?
          </Text>
          <Text style={styles.decisionSubtitle}>
            If you’re back tomorrow, the timer pauses and the job stays open.
            Materials, photos, and notes all roll into one invoice on the last
            day.
          </Text>

          <View style={styles.recommendCard}>
            <View style={styles.recommendTop}>
              <Text style={styles.recommendBadge}>RECOMMENDED</Text>
              <Ionicons name="time-outline" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.recommendTitle}>Continue tomorrow</Text>
            <Text style={styles.recommendText}>
              Job stays open · status changes to{' '}
              <Text style={styles.recommendStrong}>Paused</Text> · everything
              carries over.
            </Text>
            <View style={styles.recommendStat}>
              <Text style={styles.recommendStatText}>
                {`Day ${dayNumber} so far · ${fmtHoursMin(dayHours)} · ${fmtMoney(dayMats)} materials`}
              </Text>
            </View>
          </View>

          <View style={styles.finishCard}>
            <View style={styles.finishCardHead}>
              <Text style={styles.finishCardTitle}>Job’s complete — finish</Text>
              <Ionicons name="checkmark" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.finishCardText}>
              Submit to your office now · single-day invoice generated.
            </Text>
          </View>
        </View>

        <JobFooter>
          <Button
            label="Continue tomorrow"
            fullWidth
            loading={pausing}
            onPress={continueTomorrow}
          />
          <Button
            label="Finish & submit"
            variant="outlined"
            color="secondary"
            fullWidth
            disabled={pausing}
            onPress={() => setPhase('wizard')}
          />
        </JobFooter>
      </View>
    );
  }

  // ---------------- Wizard ----------------
  // The owner ("Síle" in the design) — fall back to a generic label.
  const ownerName = detail.createdByName ?? 'your office';
  const customerNotes = notes.filter(
    n => n.visibility === 'customer_visible',
  ).length;
  const notesValue =
    notes.length === 0
      ? '—'
      : customerNotes === 0
      ? `${notes.length} employer-only`
      : `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  let title = '';
  let subtitle: string | undefined;
  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === 1 && editing) {
    const base = baseFor(editTarget) ?? new Date();
    const editD = editedDate();
    const diffMin = Math.round((editD.getTime() - base.getTime()) / 60_000);
    const targetWord = editTarget === 'start' ? 'start' : 'finish';
    const presets: { k: 'down5' | 'down15' | 'now'; label: string }[] = [
      { k: 'down5', label: 'Round down 5m' },
      { k: 'down15', label: 'Round down 15m' },
      { k: 'now', label: `Now — ${fmtClock(new Date())}` },
    ];
    title = 'Edit job times';
    subtitle =
      'Use this if you forgot to start or stop the timer — your office sees a small note that the time was edited.';
    body = (
      <View style={styles.gap16}>
        <View style={styles.segToggle}>
          {(['start', 'finish'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.segItem, editTarget === t && styles.segItemOn]}
              onPress={() => switchTarget(t)}
            >
              <Text
                style={[styles.segText, editTarget === t && styles.segTextOn]}
              >
                {t === 'start' ? 'Start time' : 'Finish time'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>DATE</Text>
          <View style={styles.dateStepper}>
            <Pressable onPress={() => setEditDayOffset(o => o - 1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.secondary} />
            </Pressable>
            <Text style={styles.dateValue}>{fmtDateLong(editD)}</Text>
            <Pressable onPress={() => setEditDayOffset(o => o + 1)} hitSlop={8}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.secondary}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.timeEditCard}>
          <View style={styles.timeEditRow}>
            <Input
              value={editHH}
              onChangeText={onEditHH}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.timeBox}
              containerStyle={styles.timeBoxWrap}
            />
            <Text style={styles.timeColon}>:</Text>
            <Input
              value={editMM}
              onChangeText={onEditMM}
              keyboardType="number-pad"
              maxLength={2}
              style={styles.timeBox}
              containerStyle={styles.timeBoxWrap}
            />
          </View>
          <View style={styles.timeEditFoot}>
            <Text style={styles.timeEditFootLabel}>
              {editTarget === 'start' ? 'START AT' : 'FINISH AT'}
            </Text>
            <Text style={styles.timeEditFootValue}>{`${editHH}:${editMM}`}</Text>
          </View>
        </View>

        <Text style={styles.presetHeading}>QUICK PRESETS</Text>
        <View style={styles.presetWrap}>
          {presets.map(p => {
            const on = activePreset === p.k;
            return (
              <Pressable
                key={p.k}
                style={[styles.preset, on && styles.presetOn]}
                onPress={() => applyPreset(p.k)}
              >
                <Text style={[styles.presetText, on && styles.presetTextOn]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Details list */}
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Auto-detected</Text>
            <Text style={styles.detailMuted}>{fmtClock(base)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>You&apos;re setting</Text>
            <Text style={styles.detailStrong}>{`${editHH}:${editMM}`}</Text>
          </View>
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailLabel}>Difference</Text>
            <Text style={styles.detailDiff}>{diffLabelFor(diffMin)}</Text>
          </View>
        </View>

        <Input
          label="Reason for edit (optional)"
          placeholder={`Forgot to stop the timer when I left site.`}
          value={editReason}
          onChangeText={setEditReason}
          multiline
          numberOfLines={3}
          style={styles.reasonInput}
        />
      </View>
    );
    footer = (
      <Button
        label={`Save ${targetWord} · ${editHH}:${editMM}`}
        fullWidth
        onPress={saveTimeEdit}
      />
    );
  } else if (step === 1) {
    title = 'Finishing now?';
    subtitle = `We logged your start at ${
      startDate ? fmtClock(startDate) : '—'
    } and finish at ${
      finishDate ? fmtClock(finishDate) : '—'
    }. Adjust either if you need to fix things up retroactively.`;
    body = (
      <View style={styles.gap12}>
        <View style={styles.timeCard}>
          <View style={styles.flexRow}>
            <Text style={styles.timeLabel}>STARTED</Text>
            <Pressable onPress={() => openEditor('start')} hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <Text style={styles.timeValue}>
            {startDate ? fmtClock(startDate) : '—'}
          </Text>
        </View>
        <View style={[styles.timeCard, styles.timeCardActive]}>
          <View style={styles.flexRow}>
            <Text style={styles.timeLabel}>FINISHED</Text>
            <Pressable onPress={() => openEditor('finish')} hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <Text style={styles.timeValue}>
            {finishDate ? fmtClock(finishDate) : '—'}
          </Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL TIME ON SITE</Text>
          <Text style={styles.totalValue}>{fmtHoursMin(spanHours)}</Text>
        </View>
        <View style={styles.warnBox}>
          <Ionicons name="alert-circle" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            <Text style={styles.warnStrong}>Forgot to off the timer? </Text>
            Tap a card to set the real start or finish time — we log the edit so
            {` ${ownerName}`} can see what you changed.
          </Text>
        </View>
      </View>
    );
    footer = (
      <>
        <Button
          label={`Finish at ${finishDate ? fmtClock(finishDate) : '—'} ✓`}
          fullWidth
          onPress={() => setStep(2)}
        />
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Not yet — keep working</Text>
        </Pressable>
      </>
    );
  } else if (step === 2) {
    title = 'Snap after photos.';
    subtitle =
      'Two or three of the finished work. They sit next to the before shots.';
    body = (
      <View style={styles.gap16}>
        {afterPhotos.length ? (
          <PhotoStrip
            photos={afterPhotos.map(p => ({
              label: p.time ? `AFTER · ${p.time}` : 'AFTER',
              uri: p.uri,
            }))}
            grouped
          />
        ) : null}

        <Pressable style={styles.photoTile} onPress={addAfterPhoto}>
          {capturing ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <>
              <Ionicons
                name="camera-outline"
                size={28}
                color={colors.textMuted}
              />
              <Text style={styles.photoTileText}>Add another</Text>
            </>
          )}
        </Pressable>

        {refPhotos.length ? (
          <PhotoStrip
            photos={refPhotos.map(p => ({ label: p.label, uri: p.uri }))}
            grouped
          />
        ) : null}
      </View>
    );
    footer = (
      <>
        <Button label="Continue" fullWidth onPress={() => setStep(3)} />
        <Pressable onPress={() => setStep(3)} hitSlop={8} style={styles.linkBtn}>
          <Text style={styles.linkText}>Skip</Text>
        </Pressable>
      </>
    );
  } else if (step === 3) {
    title = 'What got done?';
    subtitle =
      'A line or two — this is the description your office and the customer may see on the invoice.';
    body = (
      <View style={styles.gap16}>
        <Input
          placeholder="e.g. Replaced 22mm ball valve and 1m of copper pipe behind boiler. Pressure tested — no leaks remaining."
          value={summary}
          onChangeText={setSummary}
          multiline
          numberOfLines={5}
          style={styles.summaryInput}
        />
        <View>
          <Text style={styles.quickAddLabel}>QUICK ADD</Text>
          <View style={styles.chipWrap}>
            {SUMMARY_CHIPS.map(c => (
              <Pressable
                key={c}
                style={styles.chip}
                onPress={() => toggleChip(c)}
              >
                <Text style={styles.chipText}>+ {c}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            AI uses this as the description line — keep it factual. Trayd will
            not reword it.
          </Text>
        </View>
      </View>
    );
    footer = <Button label="Continue" fullWidth onPress={() => setStep(4)} />;
  } else if (step === 4) {
    const scanReceipt = () =>
      navigation.navigate('AddReceipt', { jobId: params.jobId });
    title = 'Materials look right?';
    subtitle =
      'Everything logged across the day, in one list. Make sure nothing’s missing before submitting.';
    body = (
      <View style={styles.gap12}>
        <View style={styles.card}>
          {materials.length ? (
            materials.map((m, i) => (
              <Pressable
                key={m.id}
                onPress={() => openEditMaterial(m)}
                style={[
                  styles.matRow,
                  i < materials.length - 1 && styles.matDivider,
                ]}
              >
                <View style={styles.matMain}>
                  <Text style={styles.matName}>{m.description}</Text>
                  <View style={styles.matMeta}>
                    <View style={styles.matChip}>
                      <Text style={styles.matChipText}>
                        {m.source === 'receipt' ? 'RECEIPT' : 'VAN STOCK'}
                      </Text>
                    </View>
                    <Text style={styles.matQty}>{`qty ${m.quantity}`}</Text>
                  </View>
                </View>
                <Text style={styles.matAmount}>
                  {fmtMoney(m.quantity * m.unitCost)}
                </Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>Nothing logged.</Text>
          )}
          <Pressable style={styles.addItemBtn} onPress={openNewMaterial}>
            <Ionicons name="add" size={16} color={colors.secondary} />
            <Text style={styles.addItemText}>Add van stock</Text>
          </Pressable>
        </View>

        <View style={styles.materialsTotalBar}>
          <Text style={styles.materialsTotalBarLabel}>MATERIALS TOTAL</Text>
          <Text style={styles.materialsTotalBarValue}>
            {fmtMoney(materialsTotal)}
          </Text>
        </View>
      </View>
    );
    footer = (
      <>
        <Button
          label="Looks right — continue"
          fullWidth
          onPress={() => setStep(5)}
        />
        <Pressable onPress={scanReceipt} hitSlop={8} style={styles.linkBtn}>
          <Text style={styles.editLink}>Scan a receipt</Text>
        </Pressable>
      </>
    );
  } else {
    const crewCount = new Set(segments.map(s => s.memberId)).size;
    const labourCrew = crewCount <= 1 ? 'just you' : `${crewCount} crew`;
    const dayIds = Array.from(
      new Set(segments.map(s => s.jobDayId).filter(Boolean)),
    );
    const totalDays = Math.max(1, dayIds.length);
    const jobMeta = [
      detail.customerEircode,
      totalDays > 1 ? `day ${totalDays} of ${totalDays}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    title = `Send this to ${ownerName}?`;
    subtitle = `This is a draft summary, not the final invoice — ${ownerName} reviews the full line-by-line and edits before sending. Catch anything wrong now.`;
    body = (
      <View style={styles.gap12}>
        <View style={styles.draftCard}>
          <View style={styles.draftHead}>
            <Text style={styles.draftEyebrow}>JOB</Text>
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>AWAITING REVIEW</Text>
            </View>
          </View>
          <Text style={styles.draftCustomer}>
            {detail.customerName ?? 'Customer'}
          </Text>
          {jobMeta ? <Text style={styles.draftMeta}>{jobMeta}</Text> : null}

          <View style={styles.draftDivider} />
          <DraftRow label={`Labour · ${labourCrew}`} value={fmtHoursMin(hours)} />
          <DraftRow
            label={`Materials · ${materials.length} line${materials.length === 1 ? '' : 's'}`}
            value={fmtMoney(materialsTotal)}
          />
          <DraftRow
            label="Before / after photos"
            value={`${photoCounts.beforeMid} + ${photoCounts.after}`}
          />
          <DraftRow label="Notes" value={notesValue} last />

          <View style={styles.draftTotalRow}>
            <View>
              <Text style={styles.draftTotalLabel}>DRAFT TOTAL</Text>
              <Text style={styles.draftTotalSub}>{`INCL. ${vatRate}% VAT`}</Text>
            </View>
            <Text style={styles.draftTotalValue}>{fmtMoney(draftTotal)}</Text>
          </View>
          <Text style={styles.draftCaveat}>
            {ownerName}&apos;s review may change this
          </Text>
        </View>

        <View style={styles.warnBox}>
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <Text style={styles.warnText}>
            You won’t see the final invoice document. Once {ownerName} approves,
            this job goes Approved.
          </Text>
        </View>
      </View>
    );
    footer = (
      <>
        <Button
          label={`Submit to ${ownerName}`}
          leftIcon="paper-plane"
          fullWidth
          loading={submitting}
          onPress={submit}
        />
        <Pressable onPress={() => setStep(1)} hitSlop={8} style={styles.linkBtn}>
          <Text style={styles.linkText}>Go back and fix something</Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <WizardScaffold
        step={step}
        total={TOTAL}
        flowLabel="Wrap up"
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        onCancel={() => navigation.goBack()}
        footer={footer}
      >
        {body}
      </WizardScaffold>
      <MaterialSheet
        mode={matSheet}
        itemName={itemName}
        itemUnit={itemUnit}
        itemQty={itemQty}
        itemCost={itemCost}
        saving={savingItem}
        onPick={onPickMaterial}
        onChangeQty={setItemQty}
        onChangeCost={setItemCost}
        onSave={saveMaterial}
        onRemove={removeMaterial}
        onClose={() => setMatSheet(null)}
      />
    </>
  );
};

const DraftRow = ({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) => {
  const styles = useThemedStyles(makeWrapUpStyles);
  return (
    <View style={[styles.draftRow, last && styles.draftRowLast]}>
      <Text style={styles.draftRowLabel}>{label}</Text>
      <Text style={styles.draftRowValue}>{value}</Text>
    </View>
  );
};

export default WrapUpJobScreen;
