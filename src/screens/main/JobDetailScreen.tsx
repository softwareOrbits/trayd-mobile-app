import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
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
import { Button, JobHeader } from '@/components/ui';
import { StatusBadge, LiveStateBadge } from '@/components/jobs';
import {
  ActionGrid,
  Callout,
  DayRow,
  EmployerNote,
  InfoRow,
  LineItem,
  LineItemRow,
  LocationCard,
  PausedCard,
  PhotoStrip,
  RosterChips,
  Section,
  TimerCard,
  type PhotoTag,
  type RosterMember,
} from '@/components/jobDetail';
import {
  buildDayBreakdown,
  deleteJobPhoto,
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
  cancelJob,
  deleteJob,
  pausedSinceFrom,
  pauseJob,
  resumeJob,
  segmentsElapsedHours,
  type JobCrewMember,
  type JobDay,
  type JobMaterial,
  type JobNote,
  type JobPhoto,
  type JobSegment,
} from '@/services/jobs';
import { enqueueAction, flushOutbox, queueFinish } from '@/services/outbox';
import { loadJobCache, saveJobCache } from '@/services/jobCache';
import { offlineActionBlocked } from '@/offline';
import { CertComplianceBanner, useCertGate } from '@/compliance';
import {
  addMaterial as addMaterialOffline,
  editMaterial as editMaterialOffline,
  removeMaterial as removeMaterialOffline,
} from '@/offline/materialActions';
import type { SelectedMaterial } from '@/components/MaterialSelect';
import {
  MaterialSheet,
  TimeEditSheet,
  ConfirmActionModal,
} from '@/components/jobDetail/DetailModals';
import { fetchMyMember } from '@/services/member';
import { signOut } from '@/store/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs, patchJobStatus } from '@/store/jobsSlice';
import { setPendingJobStatus } from '@/store/pendingJobsSlice';
import { getMappedId } from '@/offline/idRemap';
import { isOnline } from '@/offline/connectivity';
import { goBackSafe } from '@/utils/navigation';
import { uuidv4 } from '@/utils/uuid';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { dayNumberFor, formatElapsed } from '@/utils/liveMeta';
import { formatDuration } from '@/utils/duration';
import { isNetworkError } from '@/utils/errors';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  detailStateFor,
  JOB_TYPE_LABEL,
  type JobDetail,
  type JobStatus,
  type JobTabKey,
  type MainStackParamList,
} from '@/types';
import { makeJobDetailStyles } from '@/styles/jobDetail.styles';
import {
  detailFromCachedJob,
  fmtDate,
  fmtTime,
  joinDot,
  money,
  toLineItem,
} from '@/components/jobDetail/detailScreen.helpers';

const JobDetailScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeJobDetailStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'JobDetail'>>();

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

  const dispatch = useAppDispatch();
  const cachedJob = useAppSelector(s =>
    s.jobs.items.find(j => j.id === params.jobId),
  );
  const isPendingJob = useAppSelector(s =>
    s.pendingJobs.items.some(j => j.id === params.jobId),
  );
  const pendingRef = useRef(false);
  pendingRef.current = isPendingJob && !getMappedId(params.jobId);
  const cachedJobRef = useRef(cachedJob);
  cachedJobRef.current = cachedJob;
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const certBlocked = useCertGate();
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
    if (pendingRef.current || !isOnline()) {
      loadJobCache(jobId).then(cached => {
        if (!cached) return;
        if (cached.materials) setMaterials(cached.materials);
        if (cached.notes) setNotes(cached.notes);
        if (cached.crew) setCrew(cached.crew);
        if (cached.segments) setSegments(cached.segments);
        if (cached.days) setDays(cached.days);
        if (cached.photos) setPhotos(cached.photos);
      });
      return;
    }
    fetchJobPhotos(jobId)
      .then(p => {
        setPhotos(p);
        saveJobCache(jobId, { photos: p });
      })
      .catch(async () => {
        const cached = await loadJobCache(jobId);
        if (cached?.photos) setPhotos(cached.photos);
      });
    Promise.allSettled([
      fetchJobMaterials(jobId),
      fetchJobNotes(jobId),
      fetchJobRoster(jobId),
      fetchJobSegments(jobId),
      fetchJobDays(jobId),
    ]).then(async ([mats, nts, rost, segs, dys]) => {
      const val = <T,>(r: PromiseSettledResult<T>) =>
        r.status === 'fulfilled' ? r.value : null;
      if (mats.status === 'fulfilled') setMaterials(mats.value);
      if (nts.status === 'fulfilled') setNotes(nts.value);
      if (rost.status === 'fulfilled') setCrew(rost.value);
      if (segs.status === 'fulfilled') setSegments(segs.value);
      if (dys.status === 'fulfilled') setDays(dys.value);

      const anyFailed = [mats, nts, rost, segs, dys].some(
        r => r.status === 'rejected',
      );
      if (!anyFailed) {
        saveJobCache(jobId, {
          materials: val(mats) ?? undefined,
          notes: val(nts) ?? undefined,
          crew: val(rost) ?? undefined,
          segments: val(segs) ?? undefined,
          days: val(dys) ?? undefined,
        });
        return;
      }
      const cached = await loadJobCache(jobId);
      if (!cached) return;
      if (mats.status === 'rejected' && cached.materials)
        setMaterials(cached.materials);
      if (nts.status === 'rejected' && cached.notes) setNotes(cached.notes);
      if (rost.status === 'rejected' && cached.crew) setCrew(cached.crew);
      if (segs.status === 'rejected' && cached.segments)
        setSegments(cached.segments);
      if (dys.status === 'rejected' && cached.days) setDays(cached.days);
    });
  }, []);

  const cachedDetail = useCallback(async (): Promise<JobDetail | null> => {
    const job = cachedJobRef.current;
    const cached = await loadJobCache(params.jobId);
    const base = cached?.detail ?? (job ? detailFromCachedJob(job) : null);
    if (!base) return null;
    return job ? { ...base, status: job.status } : base;
  }, [params.jobId]);

  const loadDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    if (pendingRef.current || !isOnline()) {
      setOffline(!isOnline());
      cachedDetail()
        .then(base => base && setDetail(base))
        .finally(() => setLoading(false));
      return;
    }
    setOffline(false);
    fetchJobDetail(params.jobId)
      .then(d => {
        setDetail(d);
        saveJobCache(params.jobId, { detail: d });
      })
      .catch(async e => {
        if (isNetworkError(e)) {
          setOffline(true);
          const base = await cachedDetail();
          if (base) setDetail(prev => prev ?? base);
        } else {
          setError(e?.message ?? 'Something went wrong.');
        }
      })
      .finally(() => setLoading(false));
  }, [params.jobId, cachedDetail]);

  const refreshDetail = useCallback(() => {
    if (pendingRef.current || !isOnline()) {
      cachedDetail().then(base => base && setDetail(base));
      return;
    }
    fetchJobDetail(params.jobId)
      .then(d => {
        setDetail(d);
        saveJobCache(params.jobId, { detail: d });
      })
      .catch(() => {});
  }, [params.jobId, cachedDetail]);

  useEffect(() => {
    let active = true;
    loadDetail();
    fetchMyMember()
      .then(m => active && setMyMemberId(m.id))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [params.jobId, loadDetail]);

  // Replay any offline-queued lifecycle actions, then refresh on success.
  const flushAndRefresh = useCallback(() => {
    flushOutbox()
      .then(n => {
        const mapped = getMappedId(params.jobId);
        if (mapped && mapped !== params.jobId) {
          navigation.replace('JobDetail', { jobId: mapped });
          return;
        }
        if (n > 0) {
          fetchJobDetail(params.jobId).then(setDetail).catch(() => {});
          dispatch(fetchJobs());
        }
      })
      .catch(() => {});
  }, [params.jobId, dispatch, navigation]);

  useEffect(() => {
    const mapped = getMappedId(params.jobId);
    if (mapped && mapped !== params.jobId) {
      navigation.replace('JobDetail', { jobId: mapped });
    }
  }, [params.jobId, navigation]);

  // Fires on mount and again whenever a child screen (wrap-up, add-content)
  // pops back — refresh both the job status and its session data so a pause /
  // resume / log done elsewhere is reflected here.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        refreshDetail();
        loadSession(params.jobId);
        flushAndRefresh();
      }),
    [navigation, params.jobId, loadSession, flushAndRefresh, refreshDetail],
  );

  // Also flush when the app returns to the foreground ("when signal returns").
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') flushAndRefresh();
    });
    return () => sub.remove();
  }, [flushAndRefresh]);


  // Pause / Resume via the lifecycle RPCs (segment-based clock). Offline, the
  // action is queued with its timestamp and replayed on reconnect (mds §1).
  const lifecycle = async (action: 'pause' | 'resume', label: string) => {
    if (!detail || acting) return;
    if (action === 'resume' && certBlocked()) return;
    if (offlineActionBlocked()) return;
    setActing(true);
    const atIso = new Date().toISOString();

    // Last one on the clock ⇒ the job itself is down, so use the crew-level RPC:
    // only `pause_job` sets jobs.status = 'paused', which is what the Resume tab
    // reads. If mates are still working, this is just my own break.
    const crewStillWorking = segments.some(
      s => s.finishTime == null && s.memberId !== myMemberId,
    );
    const crewLevel =
      action === 'pause' ? !crewStillWorking : detail.status === 'paused';

    try {
      if (action === 'pause') await pauseJob(detail.id, atIso, { crew: crewLevel });
      else await resumeJob(detail.id, atIso, { crew: crewLevel });
      dispatch(
        patchJobStatus({
          id: detail.id,
          status: action === 'pause' && !crewStillWorking ? 'paused' : 'active',
        }),
      );
      dispatch(fetchJobs());
      toastSuccess(label);
      if (action === 'pause' && !crewStillWorking) {
        resetToJobsTab('resume');
        return;
      }
      setDetail(await fetchJobDetail(detail.id));
      loadSession(detail.id);
    } catch (e) {
      if (isNetworkError(e)) {
        await enqueueAction({
          id: `${detail.id}:${action}:${atIso}`,
          jobId: detail.id,
          kind: action,
          atIso,
          crew: crewLevel,
        });
        const nextSegments: JobSegment[] =
          action === 'pause'
            ? segments.map(s =>
                s.finishTime == null && s.memberId === myMemberId
                  ? {
                      ...s,
                      finishTime: atIso,
                      hours: Math.max(
                        0,
                        (Date.parse(atIso) - Date.parse(s.startTime)) /
                          3_600_000,
                      ),
                    }
                  : s,
              )
            : [
                ...segments,
                {
                  id: uuidv4(),
                  jobDayId: days[days.length - 1]?.id ?? null,
                  memberId: myMemberId ?? detail.primaryMemberId ?? '',
                  startTime: atIso,
                  finishTime: null,
                  hours: null,
                },
              ];
        const nextStatus: JobStatus = nextSegments.some(
          s => s.finishTime == null,
        )
          ? 'active'
          : 'paused';
        const nextDetail = { ...detail, status: nextStatus };
        setSegments(nextSegments);
        setDetail(nextDetail);
        saveJobCache(detail.id, { segments: nextSegments, detail: nextDetail });
        dispatch(setPendingJobStatus({ id: detail.id, status: nextStatus }));
        dispatch(patchJobStatus({ id: detail.id, status: nextStatus }));
        Toast.show({ type: 'info', text1: 'Saved offline — will sync.' });
        if (action === 'pause' && nextStatus === 'paused') {
          resetToJobsTab('resume');
          return;
        }
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
    if (offlineActionBlocked()) return;
    setActing(true);
    const atIso = new Date().toISOString();
    try {
      await finishJob({
        jobId: detail.id,
        summary: null,
        totalHours: null,
        atIso,
      });
      dispatch(fetchJobs());
      toastSuccess('Quote sent for review.');
      resetToJobsTab('done');
    } catch (e) {
      if (isNetworkError(e)) {
        await queueFinish({
          jobId: detail.id,
          summary: null,
          totalHours: null,
          atIso,
        });
        dispatch(patchJobStatus({ id: detail.id, status: 'awaiting_review' }));
        dispatch(
          setPendingJobStatus({ id: detail.id, status: 'awaiting_review' }),
        );
        saveJobCache(detail.id, {
          detail: { ...detail, status: 'awaiting_review' },
        });
        Toast.show({
          type: 'info',
          text1: 'Saved offline — quote syncs when you reconnect.',
        });
        resetToJobsTab('done');
      } else if (isAccessRevoked(e)) {
        dispatch(signOut());
      } else {
        toastError(e, 'Could not submit the quote.');
      }
    } finally {
      setActing(false);
    }
  };

  // ----- Timer edit (my segment's start time) -----
  // Starting a job opens a segment for every crew member, so the first open
  // segment is often someone else's — editing it is an audited write against
  // their hours, and leaves my own timer unchanged.
  //
  // Paused is editable too: I still have a closed segment whose start time can
  // be wrong, and the DB trigger recomputes its hours from the new start.
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const editSegment = useMemo(() => {
    if (!myMemberId) return null;
    const mine = segments.filter(s => s.memberId === myMemberId);
    return (
      mine.find(s => s.finishTime == null) ??
      [...mine].sort((a, b) => b.startTime.localeCompare(a.startTime))[0] ??
      null
    );
  }, [segments, myMemberId]);

  const openTimeEdit = () => {
    if (!editSegment) {
      Toast.show({ type: 'info', text1: 'You have no time logged to edit.' });
      return;
    }
    const d = new Date(editSegment.startTime);
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
    if (!editSegment || savingTime) return;
    const d = new Date(editSegment.startTime);
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
    if (
      editSegment.finishTime &&
      d.getTime() >= Date.parse(editSegment.finishTime)
    ) {
      Toast.show({
        type: 'error',
        text1: 'Start time is after you stopped.',
      });
      return;
    }
    setSavingTime(true);
    try {
      await editSegmentStartTime(
        editSegment.id,
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
    if (offlineActionBlocked()) return;
    setSaving(true);
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
        const { queued } = await editMaterialOffline(matSheet, {
          description: itemName.trim(),
          quantity: qty,
          unitCost: cost,
        });
        if (queued) {
          const editedId = matSheet;
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
      setSaving(false);
    }
  };

  const removeMaterial = async () => {
    if (!detail || matSheet === 'new' || !matSheet || saving) return;
    if (offlineActionBlocked()) return;
    setSaving(true);
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
                leadingIcon={({ size }) => (
                  <Ionicons
                    name="create-outline"
                    size={size}
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
                leadingIcon={({ size }) => (
                  <Ionicons
                    name="close-circle-outline"
                    size={size}
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
                leadingIcon={({ size }) => (
                  <Ionicons
                    name="trash-outline"
                    size={size}
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

  if (offline && !detail) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <Ionicons
            name="cloud-offline-outline"
            size={40}
            color={colors.textMuted}
          />
          <Text style={styles.offlineTitle}>You’re offline</Text>
          <Text style={styles.missingText}>
            Reconnect to load this job. Anything you log meanwhile will sync
            when you’re back online.
          </Text>
          <Button label="Try again" onPress={loadDetail} style={styles.retryBtn} />
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
      goBackSafe(navigation);
    } catch (e) {
      toastError(e, 'Could not delete the job.');
      setActioning(false);
    }
  };

  // Live elapsed from job_time_entries segments (the billing source of truth);
  // fall back to started_at for jobs started before the clock existed.
  const mySegments = myMemberId
    ? segments.filter(s => s.memberId === myMemberId)
    : segments;
  const iAmWorking = segments.some(
    s => s.finishTime == null && s.memberId === myMemberId,
  );
  const myHasSegments = segments.some(s => s.memberId === myMemberId);
  const myTimerStatus = iAmWorking
    ? 'RUNNING'
    : myHasSegments
    ? 'PAUSED'
    : 'NOT STARTED';
  const segElapsed = segmentsElapsedHours(mySegments, now);
  const elapsed = myHasSegments
    ? formatElapsed(segElapsed.hours * 3_600_000)
    : segments.length === 0 && detail.startedAt
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
                formatDuration(d.hours),
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
    ? crew.map(c => {
        const seg = segments.filter(s => s.memberId === c.id);
        const working = seg.length ? seg.some(s => s.finishTime == null) : null;
        return {
          name: c.id === myMemberId ? `${c.name} (you)` : c.name,
          confirmed: true,
          working,
        };
      })
    : detail.primaryMemberName
    ? [{ name: detail.primaryMemberName, confirmed: true }]
    : [];

  const lineItems: LineItem[] = materials.map(toLineItem);

  const photoTags: PhotoTag[] = photos.map(p => ({
    // DB stores before/during/after; the design's label for "during" is MID.
    label: p.phase === 'during' ? 'MID' : p.phase.toUpperCase(),
    uri: p.url ?? undefined,
    id: p.id,
  }));

  const onDeletePhoto = (id: string) => {
    const target = photos.find(p => p.id === id);
    if (!target) return;
    Alert.alert('Remove photo?', 'This permanently deletes the photo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteJobPhoto({
              id: target.id,
              storagePath: target.storagePath,
            });
            setPhotos(prev => prev.filter(p => p.id !== id));
            toastSuccess('Photo removed.');
          } catch (e) {
            toastError(e, 'Could not remove the photo.');
          }
        },
      },
    ]);
  };

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

  const isQuote = detail.jobType === 'quote';
  const scopeRows: { label: string; included: boolean }[] = [
    { label: 'Site photos', included: true },
    { label: 'Scope notes', included: true },
    { label: 'Suggested materials', included: true },
  ];

  const quoteBody = (
    <>
      {state === 'active' ? (
        <View style={styles.block}>
          <TimerCard
            time={elapsed}
            status={myTimerStatus}
            onEdit={openTimeEdit}
          />
        </View>
      ) : null}
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
            <Text style={styles.calloutStrong}>Rough materials help. </Text>
            Add anything you reckon the job needs. On submit this becomes a
            Quote record — your office builds the formal quote from your photos,
            notes &amp; materials.
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
          <PhotoStrip photos={photoTags} grouped onDelete={onDeletePhoto} />
        ) : (
          <Text style={styles.emptyText}>No photos yet.</Text>
        )}
      </Section>
      <Section
        title={materials.length ? `Materials · ${materials.length}` : 'Materials'}
        action="Add"
        onAction={openNewMaterial}
        card={false}
      >
        {materials.length ? (
          materials.map((m, i) => (
            <Pressable key={m.id} onPress={() => openEditMaterial(m)}>
              <LineItemRow
                item={lineItems[i]}
                last={i === materials.length - 1}
                editable
              />
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No materials added yet.</Text>
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
        onPress={() =>
          state === 'active'
            ? lifecycle('pause', 'Saved — pick it up under Resume.')
            : resetToJobsTab('resume')
        }
        disabled={acting}
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
              <TimerCard
                time={elapsed}
                status={myTimerStatus}
                onEdit={openTimeEdit}
              />
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
              action={materials.length ? (editingLogs ? 'Done' : 'Edit') : 'Add'}
              onAction={
                materials.length
                  ? () => setEditingLogs(v => !v)
                  : openNewMaterial
              }
            >
              {materials.length ? (
                <>
                  {materials.map((m, i) => {
                    const it = lineItems[i];
                    const last = i === materials.length - 1;
                    return editingLogs ? (
                      <Pressable key={m.id} onPress={() => openEditMaterial(m)}>
                        <LineItemRow item={it} last={last} editable />
                      </Pressable>
                    ) : (
                      <LineItemRow key={m.id} item={it} last={last} />
                    );
                  })}
                  <Pressable style={styles.addLogRow} onPress={openNewMaterial}>
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.addLogText}>Add material</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.emptyLog} onPress={openNewMaterial}>
                  <Text style={styles.cardText}>
                    Nothing logged yet — tap to add materials or van stock.
                  </Text>
                </Pressable>
              )}
            </Section>
            <Section
              title={photoTags.length ? `Photos · ${photoTags.length}` : 'Photos'}
              action="Add"
              onAction={goAddPhoto}
              card={false}
            >
              {photoTags.length ? (
                <PhotoStrip photos={photoTags} grouped onDelete={onDeletePhoto} />
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
                    summary={`${formatDuration(segElapsed.hours)} logged · resume when you’re back`}
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
            onPress={() => lifecycle('resume', 'Job started.')}
          />
        );
      case 'active':
      case 'paused':
        return iAmWorking ? (
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
        ) : (
          <View style={styles.footerStack}>
            <Button
              label={myHasSegments ? 'Resume job' : 'Start job'}
              leftIcon="play"
              fullWidth
              loading={acting}
              onPress={() =>
                lifecycle(
                  'resume',
                  myHasSegments ? 'Job resumed.' : 'Job started.',
                )
              }
            />
            {myHasSegments ? (
              <Button
                label="Mark complete"
                variant="outlined"
                color="secondary"
                fullWidth
                disabled={acting}
                onPress={goWrapUp}
              />
            ) : null}
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
      <CertComplianceBanner style={styles.certBanner} />
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

      <MaterialSheet
        mode={matSheet}
        itemName={itemName}
        itemUnit={itemUnit}
        itemQty={itemQty}
        itemCost={itemCost}
        saving={saving}
        onPick={onPickMaterial}
        onChangeQty={setItemQty}
        onChangeCost={setItemCost}
        onSave={saveMaterial}
        onRemove={removeMaterial}
        onClose={() => setMatSheet(null)}
      />

      <TimeEditSheet
        visible={timeSheet}
        hh={timeHH}
        mm={timeMM}
        reason={timeReason}
        saving={savingTime}
        onChangeHH={setTimeHH}
        onChangeMM={setTimeMM}
        onChangeReason={setTimeReason}
        onPreset={applyTimePreset}
        onSave={saveTimeEdit}
        onClose={() => setTimeSheet(false)}
      />

      <ConfirmActionModal
        mode={confirm}
        actioning={actioning}
        onConfirm={confirm === 'delete' ? runDelete : runCancel}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
};

export default JobDetailScreen;
