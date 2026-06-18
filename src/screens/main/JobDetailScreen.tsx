import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from 'react-native-paper';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';

import { Button, Input, JobHeader } from '@/components/ui';
import { StatusBadge, LiveStateBadge } from '@/components/jobs';
import {
  ActionGrid,
  Callout,
  DayRow,
  EmployerNote,
  InfoRow,
  LineItemRow,
  LocationCard,
  PausedCard,
  PhotoStrip,
  RosterChips,
  Section,
  TimerCard,
  toLineItem,
  type LineItem,
  type PhotoTag,
  type RosterMember,
} from '@/components/jobDetail';
import {
  addJobMaterial,
  buildDayBreakdown,
  deleteJobMaterial,
  editSegmentStartTime,
  fetchJobDays,
  fetchJobDetail,
  fetchJobMaterials,
  fetchJobNotes,
  fetchJobPhotos,
  fetchJobRoster,
  fetchJobSegments,
  finishJob,
  isAccessRevoked,
  updateJobMaterial,
  cancelJob,
  deleteJob,
  pausedSinceFrom,
  pauseJob,
  resumeJob,
  segmentsElapsedHours,
  updateJobStatus,
  type JobCrewMember,
  type JobDay,
  type JobMaterial,
  type JobNote,
  type JobPhoto,
  type JobSegment,
} from '@/services/jobs';
import { enqueueAction, flushOutbox } from '@/services/outbox';
import {
  MaterialSelect,
  type SelectedMaterial,
} from '@/components/MaterialSelect';
import { fetchMyMember } from '@/services/member';
import { signOut } from '@/store/authSlice';
import { detailStateFor } from '@/data/jobDetails';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { dayNumberFor, formatElapsed } from '@/utils/liveMeta';
import { isNetworkError } from '@/utils/errors';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  JOB_TYPE_LABEL,
  type JobDetail,
  type JobStatus,
  type MainStackParamList,
} from '@/types';

const fmtDate = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : null);

const joinDot = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

const money = (n: number) => `€${n.toFixed(2)}`;

const JobDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'JobDetail'>>();

  const dispatch = useAppDispatch();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Live session subresources (job_materials / job_photos / job_notes /
  // job_assignments).
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [notes, setNotes] = useState<JobNote[]>([]);
  const [crew, setCrew] = useState<JobCrewMember[]>([]);
  const [segments, setSegments] = useState<JobSegment[]>([]);
  const [days, setDays] = useState<JobDay[]>([]);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);
  const [actioning, setActioning] = useState(false);

  // Material sheet: 'new' logs van stock, a material id edits that line.
  const [matSheet, setMatSheet] = useState<'new' | string | null>(null);
  const [editingLogs, setEditingLogs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState<string | null>(null);
  const [itemQty, setItemQty] = useState('1');
  const [itemCost, setItemCost] = useState('');

  // Timer-edit sheet: adjusts the running segment's start time (audited).
  const [timeSheet, setTimeSheet] = useState(false);
  const [timeHH, setTimeHH] = useState('00');
  const [timeMM, setTimeMM] = useState('00');
  const [timeReason, setTimeReason] = useState('');
  const [savingTime, setSavingTime] = useState(false);

  // Tick the running timer once a second while the job is active.
  const isActive = detail ? detailStateFor(detail.status) === 'active' : false;
  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isActive]);

  const loadSession = useCallback((jobId: string) => {
    fetchJobMaterials(jobId)
      .then(setMaterials)
      .catch(e => console.warn('job_materials:', e?.message));
    fetchJobPhotos(jobId)
      .then(setPhotos)
      .catch(e => console.warn('job_photos:', e?.message));
    fetchJobNotes(jobId)
      .then(setNotes)
      .catch(e => console.warn('job_notes:', e?.message));
    fetchJobRoster(jobId)
      .then(setCrew)
      .catch(e => console.warn('job_assignments:', e?.message));
    fetchJobSegments(jobId)
      .then(setSegments)
      .catch(e => console.warn('job_time_entries:', e?.message));
    fetchJobDays(jobId)
      .then(setDays)
      .catch(e => console.warn('job_days:', e?.message));
  }, []);

  useEffect(() => {
    let active = true;
    fetchJobDetail(params.jobId)
      .then(d => active && setDetail(d))
      .catch(e => active && setError(e?.message ?? 'Something went wrong.'))
      .finally(() => active && setLoading(false));
    fetchMyMember()
      .then(m => active && setMyMemberId(m.id))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [params.jobId]);

  // Replay any offline-queued lifecycle actions, then refresh on success.
  const flushAndRefresh = useCallback(() => {
    flushOutbox()
      .then(n => {
        if (n > 0) {
          fetchJobDetail(params.jobId).then(setDetail).catch(() => {});
          dispatch(fetchJobs());
        }
      })
      .catch(() => {});
  }, [params.jobId, dispatch]);

  // Fires on mount and again whenever a child screen (wrap-up, add-content)
  // pops back — refresh both the job status and its session data so a pause /
  // resume / log done elsewhere is reflected here.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        fetchJobDetail(params.jobId)
          .then(setDetail)
          .catch(() => {});
        loadSession(params.jobId);
        flushAndRefresh();
      }),
    [navigation, params.jobId, loadSession, flushAndRefresh],
  );

  // Also flush when the app returns to the foreground ("when signal returns").
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') flushAndRefresh();
    });
    return () => sub.remove();
  }, [flushAndRefresh]);

  // Real status transition (Start / Finish / Pause / Resume / Mark complete).
  const transition = async (
    next: JobStatus,
    label: string,
    goBackAfter = false,
  ) => {
    if (!detail || acting) return;
    setActing(true);
    try {
      await updateJobStatus(detail.id, next);
      dispatch(fetchJobs());
      toastSuccess(label);
      if (goBackAfter) {
        navigation.goBack();
      } else {
        setDetail(await fetchJobDetail(detail.id));
      }
    } catch (e) {
      toastError(e, 'Could not update job.');
    } finally {
      setActing(false);
    }
  };

  // Pause / Resume via the lifecycle RPCs (segment-based clock). Offline, the
  // action is queued with its timestamp and replayed on reconnect (mds §1).
  const lifecycle = async (action: 'pause' | 'resume', label: string) => {
    if (!detail || acting) return;
    setActing(true);
    const atIso = new Date().toISOString();
    try {
      if (action === 'pause') await pauseJob(detail.id, atIso);
      else await resumeJob(detail.id, atIso);
      dispatch(fetchJobs());
      toastSuccess(label);
      setDetail(await fetchJobDetail(detail.id));
      loadSession(detail.id);
    } catch (e) {
      if (isNetworkError(e)) {
        await enqueueAction({
          id: `${detail.id}:${action}:${atIso}`,
          jobId: detail.id,
          kind: action,
          atIso,
        });
        // Optimistically reflect the new status; the queue syncs it for real.
        setDetail({
          ...detail,
          status: action === 'pause' ? 'paused' : 'active',
        });
        Toast.show({ type: 'info', text1: 'Saved offline — will sync.' });
      } else if (isAccessRevoked(e)) {
        dispatch(signOut());
      } else {
        toastError(e, 'Could not update job.');
      }
    } finally {
      setActing(false);
    }
  };

  // "Finish job" opens the wrap-up wizard; only its step 5 calls finish_job.
  const goWrapUp = () =>
    navigation.navigate('WrapUpJob', { jobId: params.jobId });

  // Quote visits have no materials/hours wrap-up — submit closes the job via
  // finish_job; the backend turns it into a Quote record (mds start §6 / §1).
  const submitQuote = async () => {
    if (!detail || acting) return;
    setActing(true);
    try {
      await finishJob({
        jobId: detail.id,
        summary: null,
        totalHours: null,
        atIso: new Date().toISOString(),
      });
      dispatch(fetchJobs());
      toastSuccess('Quote sent for review.');
      navigation.goBack();
    } catch (e) {
      if (isAccessRevoked(e)) {
        dispatch(signOut());
      } else {
        toastError(e, 'Could not submit the quote.');
      }
    } finally {
      setActing(false);
    }
  };

  // ----- Timer edit (running segment start time) -----
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const openSegment = segments.find(s => s.finishTime == null) ?? null;

  const openTimeEdit = () => {
    if (!openSegment) {
      Toast.show({ type: 'info', text1: 'No running timer to edit.' });
      return;
    }
    const d = new Date(openSegment.startTime);
    setTimeHH(pad2(d.getHours()));
    setTimeMM(pad2(d.getMinutes()));
    setTimeReason('');
    setTimeSheet(true);
  };

  const applyTimePreset = (kind: 'down5' | 'down15' | 'now') => {
    const d = kind === 'now' ? new Date() : new Date();
    if (kind !== 'now') {
      d.setHours(
        Math.min(23, Math.max(0, parseInt(timeHH, 10) || 0)),
        Math.min(59, Math.max(0, parseInt(timeMM, 10) || 0)),
        0,
        0,
      );
      const step = kind === 'down5' ? 5 : 15;
      d.setMinutes(d.getMinutes() - (d.getMinutes() % step), 0, 0);
    }
    setTimeHH(pad2(d.getHours()));
    setTimeMM(pad2(d.getMinutes()));
  };

  const saveTimeEdit = async () => {
    if (!openSegment || savingTime) return;
    const d = new Date(openSegment.startTime);
    d.setHours(
      Math.min(23, Math.max(0, parseInt(timeHH, 10) || 0)),
      Math.min(59, Math.max(0, parseInt(timeMM, 10) || 0)),
      0,
      0,
    );
    if (d.getTime() > Date.now()) {
      Toast.show({ type: 'error', text1: 'Start time is in the future.' });
      return;
    }
    setSavingTime(true);
    try {
      await editSegmentStartTime(
        openSegment.id,
        d.toISOString(),
        timeReason.trim() || null,
      );
      const next = await fetchJobSegments(detail!.id);
      setSegments(next);
      setTimeSheet(false);
      toastSuccess('Start time updated.');
    } catch (e) {
      toastError(e, 'Could not update the time.');
    } finally {
      setSavingTime(false);
    }
  };

  const goAddPhoto = () =>
    navigation.navigate('AddJobPhoto', {
      jobId: params.jobId,
      photoCount: photos.length,
    });
  const goAddReceipt = () =>
    navigation.navigate('AddReceipt', { jobId: params.jobId });
  const goAddNote = () =>
    navigation.navigate('AddNote', { jobId: params.jobId });

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

  // Picking from the catalog auto-fills the unit price; custom items keep it.
  const onPickMaterial = (m: SelectedMaterial) => {
    setItemName(m.name);
    setItemUnit(m.unit);
    if (m.sellPrice != null) setItemCost(String(m.sellPrice));
  };

  const saveMaterial = async () => {
    if (!detail || !itemName.trim() || !matSheet || saving) return;
    setSaving(true);
    const qty = Math.max(1, parseFloat(itemQty.replace(',', '.')) || 1);
    const cost = parseFloat(itemCost.replace(',', '.')) || 0;
    try {
      if (matSheet === 'new') {
        await addJobMaterial({
          jobId: detail.id,
          description: itemName.trim(),
          quantity: qty,
          unitCost: cost,
          unit: itemUnit,
          source: 'van_stock',
        });
      } else {
        await updateJobMaterial(matSheet, {
          description: itemName.trim(),
          quantity: qty,
          unitCost: cost,
        });
      }
      setMaterials(await fetchJobMaterials(detail.id));
      setMatSheet(null);
      toastSuccess(matSheet === 'new' ? 'Item logged.' : 'Item updated.');
    } catch (e) {
      toastError(e, 'Could not save the item.');
    } finally {
      setSaving(false);
    }
  };

  const removeMaterial = async () => {
    if (!detail || matSheet === 'new' || !matSheet || saving) return;
    setSaving(true);
    try {
      await deleteJobMaterial(matSheet);
      setMaterials(await fetchJobMaterials(detail.id));
      setMatSheet(null);
      toastSuccess('Item removed.');
    } catch (e) {
      toastError(e, 'Could not remove the item.');
    } finally {
      setSaving(false);
    }
  };


  const manageState = detail ? detailStateFor(detail.status) : null;
  const ownerId = detail?.createdById ?? detail?.primaryMemberId ?? null;
  const ownsJob = !!detail && !!myMemberId && ownerId === myMemberId;
  const menuEdit = ownsJob && manageState === 'scheduled';
  const menuCancel =
    ownsJob &&
    (manageState === 'scheduled' ||
      manageState === 'active' ||
      manageState === 'paused');
  const menuDelete =
    ownsJob && (manageState === 'scheduled' || manageState === 'cancelled');
  const canManage = menuEdit || menuCancel || menuDelete;

  const header = (
    <JobHeader
      title={detail?.customerName ?? 'Job'}
      onBack={() => navigation.goBack()}
      right={
        canManage ? (
          <Menu
            visible={menuOpen}
            onDismiss={() => setMenuOpen(false)}
            anchorPosition="bottom"
            contentStyle={styles.menuContent}
            anchor={
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            }
          >
            {menuEdit ? (
              <Menu.Item
                onPress={() => {
                  setMenuOpen(false);
                  goEdit();
                }}
                leadingIcon={() => (
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.secondary}
                  />
                )}
                title="Edit job"
                titleStyle={styles.menuItemText}
              />
            ) : null}
            {menuCancel ? (
              <Menu.Item
                onPress={() => {
                  setMenuOpen(false);
                  setConfirm('cancel');
                }}
                leadingIcon={() => (
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.secondary}
                  />
                )}
                title="Cancel job"
                titleStyle={styles.menuItemText}
              />
            ) : null}
            {menuDelete ? (
              <Menu.Item
                onPress={() => {
                  setMenuOpen(false);
                  setConfirm('delete');
                }}
                leadingIcon={() => (
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.error}
                  />
                )}
                title="Delete job"
                titleStyle={[styles.menuItemText, { color: colors.error }]}
              />
            ) : null}
          </Menu>
        ) : null
      }
    />
  );

  if (loading) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.missingText}>
            {error ?? 'This job is no longer available.'}
          </Text>
        </View>
      </View>
    );
  }

  const state = detailStateFor(detail.status);
  const scheduledFor = joinDot(
    fmtDate(detail.scheduledDate),
    fmtTime(detail.scheduledStartTime),
  );

  const goEdit = () => {
    setMenuOpen(false);
    navigation.navigate('EditJob', { jobId: detail.id });
  };

  const runCancel = async () => {
    setActioning(true);
    try {
      await cancelJob(detail.id);
      dispatch(fetchJobs());
      setConfirm(null);
      setDetail(await fetchJobDetail(detail.id));
      toastSuccess('Job cancelled.');
    } catch (e) {
      toastError(e, 'Could not cancel the job.');
    } finally {
      setActioning(false);
    }
  };

  const runDelete = async () => {
    setActioning(true);
    try {
      await deleteJob(detail.id);
      dispatch(fetchJobs());
      setConfirm(null);
      toastSuccess('Job deleted.');
      navigation.goBack();
    } catch (e) {
      toastError(e, 'Could not delete the job.');
      setActioning(false);
    }
  };

  // Live elapsed from job_time_entries segments (the billing source of truth);
  // fall back to started_at for jobs started before the clock existed.
  const segElapsed = segmentsElapsedHours(segments, now);
  const elapsed = segments.length
    ? formatElapsed(segElapsed.hours * 3_600_000)
    : detail.startedAt
    ? formatElapsed(now - new Date(detail.startedAt).getTime())
    : '00:00:00';
  // Per-day breakdown from job_days (mds §5.5). The "Day N+1 · Resume today"
  // card is synthetic — resume_job materialises the row only on resume.
  const breakdown = buildDayBreakdown(days, segments, materials);
  const todayISO = new Date().toISOString().slice(0, 10);
  const lastDay = breakdown.length ? breakdown[breakdown.length - 1] : null;
  const showNextDayPrompt =
    state === 'paused' && !!lastDay && lastDay.workDate < todayISO;
  const day = days.length
    ? days.length + (showNextDayPrompt ? 1 : 0)
    : segElapsed.earliestStart ?? detail.startedAt
    ? dayNumberFor(segElapsed.earliestStart ?? detail.startedAt!)
    : 1;
  const pausedSince = pausedSinceFrom(segments);

  const fmtDayDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  const fmtPausedSince = (iso: string) => {
    const d = new Date(iso);
    return `${d
      .toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .toUpperCase()} · ${fmtTime(iso.slice(11, 16))}`;
  };
  const hoursLabel = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm ? `${hh}h ${mm}m` : `${hh}h`;
  };

  // "Days so far" — only meaningful once a job spans days or is paused.
  const daysSoFar =
    days.length > 1 || state === 'paused' ? (
      <Section title="Days so far" card>
        {breakdown.map((d, i) => (
          <DayRow
            key={d.id}
            day={{
              label: `Day ${d.dayNumber} · ${fmtDayDate(d.workDate)}`,
              sub: joinDot(
                hoursLabel(d.hours),
                d.crew <= 1 ? 'Just you' : `${d.crew} on site`,
                money(d.materialsTotal),
              ),
            }}
            last={!showNextDayPrompt && i === breakdown.length - 1}
          />
        ))}
        {showNextDayPrompt && lastDay ? (
          <DayRow
            day={{
              label: `Day ${lastDay.dayNumber + 1} · Resume today`,
              sub: '—',
              active: true,
            }}
            last
          />
        ) : null}
      </Section>
    ) : null;

  const scheduleRows = [
    fmtDate(detail.scheduledDate)
      ? { label: 'Scheduled day', value: fmtDate(detail.scheduledDate)! }
      : null,
    fmtTime(detail.scheduledStartTime)
      ? { label: 'Start time', value: fmtTime(detail.scheduledStartTime)! }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const scheduleSection = scheduleRows.length ? (
    <Section title="Schedule">
      {scheduleRows.map((e, i) => (
        <InfoRow key={e.label} entry={e} last={i === scheduleRows.length - 1} />
      ))}
    </Section>
  ) : null;

  // Roster from job_assignments; fall back to the primary assignee.
  const roster: RosterMember[] = crew.length
    ? crew.map(c => ({
        name:
          c.id === detail.primaryMemberId ? `${c.name} (you)` : c.name,
        confirmed: true,
      }))
    : detail.primaryMemberName
    ? [{ name: `${detail.primaryMemberName} (you)`, confirmed: true }]
    : [];

  const lineItems: LineItem[] = materials.map(toLineItem);

  const photoTags: PhotoTag[] = photos.map(p => ({
    // DB stores before/during/after; the design's label for "during" is MID.
    label: p.phase === 'during' ? 'MID' : p.phase.toUpperCase(),
    uri: p.url ?? undefined,
  }));

  const fmtNoteTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const placeholder = (
    <Text style={styles.placeholder}>
      Logged items &amp; photos appear here once work starts.
    </Text>
  );

  const badge =
    state === 'active' ? (
      <LiveStateBadge state="active" />
    ) : (
      <StatusBadge status={detail.status} />
    );

  const assignedValue = crew.length
    ? crew.map(c => c.name).join(', ')
    : detail.primaryMemberName
    ? joinDot(detail.primaryMemberName, detail.primaryMemberRole)
    : null;

  const detailsRows = [
    { label: 'Type', value: JOB_TYPE_LABEL[detail.jobType] },
    detail.customerPhone
      ? { label: 'Customer phone', value: detail.customerPhone }
      : null,
    assignedValue
      ? {
          label: crew.length > 1 ? 'Crew' : 'Assigned to',
          value: assignedValue,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  // ----- Quote-visit variant (job_type === 'quote'): photos + scope notes,
  // no materials/van-stock; submit becomes a Quote record (mds start §6). -----
  const isQuote = detail.jobType === 'quote';
  const scopeRows: { label: string; included: boolean }[] = [
    { label: 'Site photos', included: true },
    { label: 'Scope notes', included: true },
    { label: 'Materials & receipts', included: false },
    { label: 'Van-stock', included: false },
  ];

  const quoteBody = (
    <>
      <Section title="Quote-visit scope" card>
        {scopeRows.map((r, i) => (
          <View
            key={r.label}
            style={[
              styles.scopeRow,
              i === scopeRows.length - 1 ? null : styles.scopeDivider,
            ]}
          >
            <Ionicons
              name={r.included ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={r.included ? colors.green : colors.textMuted}
            />
            <Text
              style={[styles.scopeText, !r.included && styles.scopeTextOff]}
            >
              {r.label}
            </Text>
          </View>
        ))}
      </Section>
      <View style={styles.block}>
        <Callout variant="note" icon="information-circle">
          <Text style={styles.calloutText}>
            <Text style={styles.calloutStrong}>No materials. </Text>
            On submit, this becomes a Quote record — your office builds the
            formal quote from your photos + notes.
          </Text>
        </Callout>
      </View>
      <Section
        title={photoTags.length ? `Photos · ${photoTags.length}` : 'Photos'}
        action="Add"
        onAction={goAddPhoto}
        card={false}
      >
        {photoTags.length ? (
          <PhotoStrip photos={photoTags} />
        ) : (
          <Text style={styles.emptyText}>No photos yet.</Text>
        )}
      </Section>
      <Section
        title={notes.length ? `Scope notes · ${notes.length}` : 'Scope notes'}
        action="Add"
        onAction={goAddNote}
        card={false}
      >
        {notes.length ? (
          <View style={styles.notesStack}>
            {notes.map(n => (
              <EmployerNote
                key={n.id}
                time={fmtNoteTime(n.createdAt)}
                text={n.body}
                tag={
                  n.visibility === 'customer_visible'
                    ? 'CUSTOMER-VISIBLE'
                    : 'EMPLOYER-ONLY'
                }
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No scope notes yet.</Text>
        )}
      </Section>
    </>
  );

  const quoteFooter = (
    <View style={styles.footerStack}>
      <Button
        label="Submit quote to office"
        rightIcon="paper-plane"
        fullWidth
        loading={acting}
        onPress={submitQuote}
      />
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={8}
        style={styles.linkBtn}
      >
        <Text style={styles.linkText}>Save and come back</Text>
      </Pressable>
    </View>
  );

  const body = () => {
    if (isQuote && (state === 'active' || state === 'paused')) {
      return quoteBody;
    }
    switch (state) {
      case 'awaiting_review':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="info" icon="lock-closed-outline">
                <Text style={styles.calloutMuted}>
                  Read-only — you&apos;ll get a push when it&apos;s approved.
                </Text>
              </Callout>
            </View>
            <Section title="Submitted">
              {[
                detail.totalHours != null
                  ? { label: 'Total hours', value: `${detail.totalHours}h` }
                  : null,
                { label: 'Materials total', value: money(detail.invoiceTotal) },
                detail.customerName
                  ? { label: 'Customer', value: detail.customerName }
                  : null,
              ]
                .filter(Boolean)
                .map((e, i, a) => (
                  <InfoRow key={e!.label} entry={e!} last={i === a.length - 1} />
                ))}
            </Section>
            {detail.summary ? (
              <Section title="Summary">
                <Text style={styles.cardText}>{detail.summary}</Text>
              </Section>
            ) : null}
          </>
        );

      case 'approved':
        return (
          <>
            <View style={styles.block}>
              <Callout variant="success" icon="checkmark">
                <Text style={styles.calloutStrong}>
                  {detail.status === 'paid'
                    ? 'This job is paid.'
                    : detail.status === 'downloaded'
                    ? 'Invoice downloaded.'
                    : 'This job is approved.'}
                </Text>
              </Callout>
            </View>
            <Section title="Final totals">
              {[
                detail.totalHours != null
                  ? { label: 'Total hours', value: `${detail.totalHours}h` }
                  : null,
                { label: 'Invoice total', value: money(detail.invoiceTotal) },
              ]
                .filter(Boolean)
                .map((e, i, a) => (
                  <InfoRow key={e!.label} entry={e!} last={i === a.length - 1} />
                ))}
            </Section>
            <Text style={styles.footnote}>
              The invoice itself stays with your employer. Payment status
              isn&apos;t shown here.
            </Text>
          </>
        );

      case 'cancelled':
        return (
          <View style={styles.block}>
            <Callout variant="note" icon="close-circle-outline">
              <Text style={styles.calloutStrong}>This job was cancelled.</Text>
            </Callout>
          </View>
        );

      // Started job: timer + roster + logged items + photos + notes + actions.
      case 'active':
        return (
          <>
            <View style={styles.block}>
              <TimerCard time={elapsed} onEdit={openTimeEdit} />
            </View>
            {scheduleSection}
            {detail.employerNote ? (
              <View style={styles.block}>
                <Callout variant="note" icon="alert-circle">
                  <Text style={styles.calloutText}>
                    <Text style={styles.calloutStrong}>
                      Note from {detail.createdByName ?? 'your employer'}:{' '}
                    </Text>
                    {detail.employerNote}
                  </Text>
                </Callout>
              </View>
            ) : null}
            {roster.length ? (
              <Section title="Roster" card={false}>
                <RosterChips members={roster} />
              </Section>
            ) : null}
            {daysSoFar}
            <Section
              title="Logged so far"
              action={
                materials.some(m => m.addedBy === myMemberId)
                  ? editingLogs
                    ? 'Done'
                    : 'Edit'
                  : undefined
              }
              onAction={() => setEditingLogs(v => !v)}
            >
              {materials.length ? (
                materials.map((m, i) => {
                  const it = lineItems[i];
                  const last = i === materials.length - 1;
                  // RLS only lets you edit/delete rows you logged.
                  const mine = !!myMemberId && m.addedBy === myMemberId;
                  return editingLogs && mine ? (
                    <Pressable key={m.id} onPress={() => openEditMaterial(m)}>
                      <LineItemRow item={it} last={last} editable />
                    </Pressable>
                  ) : (
                    <LineItemRow key={m.id} item={it} last={last} />
                  );
                })
              ) : (
                <Text style={styles.cardText}>Nothing logged yet.</Text>
              )}
            </Section>
            <Section
              title={photoTags.length ? `Photos · ${photoTags.length}` : 'Photos'}
              action="Add"
              onAction={goAddPhoto}
              card={false}
            >
              {photoTags.length ? (
                <PhotoStrip photos={photoTags} />
              ) : (
                <Text style={styles.emptyText}>No photos yet.</Text>
              )}
            </Section>
            {notes.length ? (
              <Section title="Notes" card={false}>
                <View style={styles.notesStack}>
                  {notes.map(n => (
                    <EmployerNote
                      key={n.id}
                      time={fmtNoteTime(n.createdAt)}
                      text={n.body}
                      tag={
                        n.visibility === 'customer_visible'
                          ? 'ON INVOICE'
                          : 'EMPLOYER-ONLY'
                      }
                    />
                  ))}
                </View>
              </Section>
            ) : null}
            <View style={styles.block}>
              <ActionGrid
                items={[
                  { icon: 'camera-outline', label: 'Add photo', onPress: goAddPhoto },
                  { icon: 'receipt-outline', label: 'Add receipt', onPress: goAddReceipt },
                  {
                    icon: 'cube-outline',
                    label: 'Van stock',
                    onPress: openNewMaterial,
                  },
                  { icon: 'create-outline', label: 'Add note', onPress: goAddNote },
                ]}
              />
            </View>
          </>
        );

      // scheduled / paused share the same top-half layout
      default:
        return (
          <>
            {detail.employerNote ? (
              <View style={styles.block}>
                <Callout variant="note" icon="alert-circle">
                  <Text style={styles.calloutText}>
                    <Text style={styles.calloutStrong}>
                      Note from {detail.createdByName ?? 'your employer'}:{' '}
                    </Text>
                    {detail.employerNote}
                  </Text>
                </Callout>
              </View>
            ) : null}
            {state === 'paused' ? (
              <View style={styles.block}>
                {pausedSince ? (
                  <PausedCard
                    since={fmtPausedSince(pausedSince)}
                    summary={`${hoursLabel(segElapsed.hours)} logged · resume when you’re back`}
                  />
                ) : (
                  <Callout variant="info" icon="time-outline">
                    <Text style={styles.calloutMuted}>Job is paused.</Text>
                  </Callout>
                )}
              </View>
            ) : null}
            {scheduleSection}
            {daysSoFar}
            {detail.customerAddress || detail.customerEircode ? (
              <Section title="Location" card={false}>
                <LocationCard
                  address={detail.customerAddress}
                  eircode={detail.customerEircode}
                />
              </Section>
            ) : null}
            <Section title="Details">
              {detailsRows.map((e, i) => (
                <InfoRow
                  key={e.label}
                  entry={e}
                  last={i === detailsRows.length - 1}
                />
              ))}
            </Section>
            {state === 'paused' ? null : placeholder}
          </>
        );
    }
  };

  const footer = () => {
    if (isQuote && (state === 'active' || state === 'paused')) {
      return quoteFooter;
    }
    switch (state) {
      case 'scheduled':
        return (
          <Button
            label="Start job"
            leftIcon="play"
            fullWidth
            loading={acting}
            onPress={() => transition('active', 'Job started.')}
          />
        );
      case 'active':
        return (
          <View style={styles.footerStack}>
            <Button
              label="Finish job"
              fullWidth
              disabled={acting}
              onPress={goWrapUp}
            />
            <Button
              label="Continue tomorrow"
              variant="outlined"
              color="secondary"
              fullWidth
              loading={acting}
              onPress={() => lifecycle('pause', 'Paused — see you tomorrow.')}
            />
          </View>
        );
      case 'paused':
        return (
          <View style={styles.footerStack}>
            <Button
              label="Resume job"
              leftIcon="play"
              fullWidth
              loading={acting}
              onPress={() => lifecycle('resume', 'Job resumed.')}
            />
            <Button
              label="Mark complete"
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={acting}
              onPress={goWrapUp}
            />
          </View>
        );
      case 'awaiting_review':
        return (
          <Text style={styles.waitingText}>Submitted · waiting for approval</Text>
        );
      default:
        return (
          <Button
            label="Back to jobs"
            variant="outlined"
            color="secondary"
            fullWidth
            onPress={() => navigation.goBack()}
          />
        );
    }
  };

  return (
    <View style={styles.flex}>
      {header}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          {badge}
          <Text style={styles.metaText}>
            {joinDot(detail.jobNumber, JOB_TYPE_LABEL[detail.jobType])}
          </Text>
        </View>
        <Text style={styles.title}>{detail.customerName ?? 'Customer'}</Text>
        {state === 'active' ? (
          <Text style={styles.subtitle}>
            {joinDot(
              detail.summary ?? detail.customerAddress,
              `day ${day}`,
            )}
          </Text>
        ) : state === 'scheduled' && scheduledFor ? (
          <Text style={styles.subtitle}>{scheduledFor}</Text>
        ) : state === 'scheduled' ? null : detail.customerAddress ? (
          <Text style={styles.subtitle}>{detail.customerAddress}</Text>
        ) : null}

        {body()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {footer()}
      </View>

      <Modal
        visible={matSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMatSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMatSheet(null)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>
              {matSheet === 'new' ? 'Log van stock' : 'Edit item'}
            </Text>
            <MaterialSelect
              value={
                itemName
                  ? {
                      materialId: null,
                      name: itemName,
                      unit: itemUnit,
                      sellPrice: null,
                    }
                  : null
              }
              onChange={onPickMaterial}
            />
            <View style={styles.modalRow}>
              <Input
                label="Qty"
                keyboardType="numeric"
                value={itemQty}
                onChangeText={setItemQty}
                containerStyle={styles.modalRowItem}
              />
              <Input
                label="Unit price (€)"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={itemCost}
                onChangeText={setItemCost}
                containerStyle={styles.modalRowItem}
              />
            </View>
            <Button
              label={matSheet === 'new' ? 'Log item' : 'Save changes'}
              fullWidth
              loading={saving}
              disabled={!itemName.trim()}
              onPress={saveMaterial}
            />
            {matSheet !== 'new' ? (
              <Pressable
                onPress={removeMaterial}
                hitSlop={8}
                style={styles.modalDeleteBtn}
              >
                <Text style={styles.modalDeleteText}>Remove item</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={timeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>Edit start time</Text>
            <Text style={styles.modalHint}>
              Adjust when the job started — we log the edit for your office.
            </Text>
            <View style={styles.timeRow}>
              <Input
                keyboardType="number-pad"
                maxLength={2}
                value={timeHH}
                onChangeText={setTimeHH}
                style={styles.timeBox}
                containerStyle={styles.timeBoxWrap}
              />
              <Text style={styles.timeColon}>:</Text>
              <Input
                keyboardType="number-pad"
                maxLength={2}
                value={timeMM}
                onChangeText={setTimeMM}
                style={styles.timeBox}
                containerStyle={styles.timeBoxWrap}
              />
            </View>
            <View style={styles.presetRow}>
              {[
                { k: 'down5' as const, label: 'Round down 5m' },
                { k: 'down15' as const, label: 'Round down 15m' },
                { k: 'now' as const, label: 'Now' },
              ].map(p => (
                <Pressable
                  key={p.k}
                  style={styles.presetChip}
                  onPress={() => applyTimePreset(p.k)}
                >
                  <Text style={styles.presetChipText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <Input
              label="Reason for edit (optional)"
              placeholder="e.g. Forgot to start the timer on arrival."
              value={timeReason}
              onChangeText={setTimeReason}
            />
            <Button
              label={`Save · ${timeHH}:${timeMM}`}
              fullWidth
              loading={savingTime}
              onPress={saveTimeEdit}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={confirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setConfirm(null)}
          />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.modalTitle}>
              {confirm === 'delete' ? 'Delete this job?' : 'Cancel this job?'}
            </Text>
            <Text style={styles.modalHint}>
              {confirm === 'delete'
                ? 'This permanently removes the job and can’t be undone.'
                : 'This marks the job as cancelled. It stays visible under Done.'}
            </Text>
            <Pressable
              style={styles.dangerBtn}
              disabled={actioning}
              onPress={confirm === 'delete' ? runDelete : runCancel}
            >
              {actioning ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={styles.dangerText}>
                  {confirm === 'delete' ? 'Yes, delete job' : 'Yes, cancel job'}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.keepBtn}
              onPress={() => setConfirm(null)}
            >
              <Text style={styles.keepText}>Keep job</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    dangerBtn: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error,
      borderRadius: theme.radii.md,
      paddingVertical: 14,
      marginTop: 4,
    },
    dangerText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.error,
    },
    keepBtn: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderRadius: theme.radii.md,
      paddingVertical: 14,
      marginTop: 10,
    },
    keepText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    missingText: { color: theme.colors.textMuted, textAlign: 'center' },

    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      flexGrow: 1,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    title: {
      marginTop: 8,
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    block: { marginTop: 18 },
    calloutText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },
    calloutStrong: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
    },
    calloutMuted: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    cardText: {
      paddingVertical: 14,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },
    placeholder: {
      marginTop: 18,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
    },
    footnote: {
      marginTop: 16,
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    waitingText: {
      textAlign: 'center',
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
      paddingVertical: 12,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 14,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderMuted,
    },
    footerStack: { gap: 12 },

    emptyText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    notesStack: { gap: 10 },

    menuContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    menuItemText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 20,
      gap: 14,
    },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    modalRow: { flexDirection: 'row', gap: 12 },
    modalRowItem: { flex: 1 },

    selectContainer: { gap: 6 },
    selectLabel: {
      color: theme.colors.black,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    selectValue: {
      flex: 1,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.black,
    },
    selectPlaceholder: { color: theme.colors.placeholder },
    selectDropdown: { gap: 8 },
    selectList: {
      maxHeight: 200,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderRadius: theme.radii.md,
    },
    selectLoading: { paddingVertical: 20 },
    selectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    selectOptionName: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    selectOptionMeta: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    selectEmpty: {
      padding: 14,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    modalDeleteBtn: { alignSelf: 'center', paddingVertical: 4 },
    modalDeleteText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.error,
    },
    modalHint: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 19,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    timeBoxWrap: { width: 80 },
    timeBox: {
      fontSize: 30,
      fontFamily: theme.fonts.monoBold,
      textAlign: 'center',
      color: theme.colors.text,
    },
    timeColon: {
      fontSize: 30,
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.text,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    presetChip: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    presetChipText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },

    scopeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 13,
    },
    scopeDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    scopeText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    scopeTextOff: {
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    linkBtn: { alignSelf: 'center', paddingVertical: 4 },
    linkText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
  });

export default JobDetailScreen;
