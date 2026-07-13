import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchJobs, patchJobStatus } from '@/store/jobsSlice';
import { setPendingJobStatus } from '@/store/pendingJobsSlice';
import { getMyMemberRef } from '@/services/member';
import { fetchJobSegments, pauseJob, type JobSegment } from '@/services/jobs';
import { saveJobCache } from '@/services/jobCache';
import { enqueueAction } from '@/services/outbox';
import { isOfflineLimitExceeded } from '@/offline';
import {
  isOvertimeOptIn,
  markReminded,
  setOvertimeOptIn,
  wasReminded,
} from '@/services/shiftFlags';
import { onShiftPush } from '@/services/shiftBus';
import {
  SHIFT_REMINDER_LEAD_MS,
  shiftCutoffFor,
  shiftDayKey,
  shiftEndLabel,
} from '@/config/shift';
import { navigationRef } from '@/navigation/navigationRef';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { isNetworkError } from '@/utils/errors';
import { toastError } from '@/utils/toast';
import { makeShiftStyles } from '@/styles/shift.styles';
import type { Job, JobStatus } from '@/types';

const CHECK_INTERVAL_MS = 30_000;

type Target = {
  jobId: string;
  jobLabel: string;
  day: string;
  cutoffMs: number;
  segments: JobSegment[];
};

type Prompt = {
  kind: 'reminder' | 'stopped';
  targets: Target[];
};

const labelFor = (job: Job) => job.customerName ?? job.jobNumber ?? 'your job';

const namesOf = (targets: Target[]) => {
  if (targets.length === 1) return targets[0].jobLabel;
  if (targets.length === 2)
    return `${targets[0].jobLabel} and ${targets[1].jobLabel}`;
  return `${targets.length} jobs`;
};

export default function ShiftCutoffProvider() {
  const dispatch = useAppDispatch();
  const styles = useThemedStyles(makeShiftStyles);
  const insets = useSafeAreaInsets();

  const isLoggedIn = useAppSelector(s => s.auth.isLoggedIn);
  const jobs = useAppSelector(s => s.jobs.items);

  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const activeJobs = useMemo(
    () => jobs.filter(j => j.status === 'active'),
    [jobs],
  );
  const activeKey = activeJobs.map(j => j.id).join(',');

  const activeRef = useRef<Job[]>(activeJobs);
  activeRef.current = activeJobs;
  const memberIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const promptRef = useRef<Prompt | null>(prompt);
  promptRef.current = prompt;

  const forceStop = useCallback(
    async (target: Target, me: string) => {
      const atIso = new Date(target.cutoffMs).toISOString();
      const closed = target.segments.map(s =>
        s.finishTime == null && s.memberId === me
          ? {
              ...s,
              finishTime: atIso,
              hours: Math.max(
                0,
                (Date.parse(atIso) - Date.parse(s.startTime)) / 3_600_000,
              ),
            }
          : s,
      );
      const crewStillWorking = closed.some(s => s.finishTime == null);
      const nextStatus: JobStatus = crewStillWorking ? 'active' : 'paused';
      // Last one on the clock ⇒ crew-level pause, so the job lands under Resume
      // rather than sitting in Live with nobody working it.
      const crew = !crewStillWorking;

      try {
        await pauseJob(target.jobId, atIso, { crew });
        dispatch(patchJobStatus({ id: target.jobId, status: nextStatus }));
      } catch (e) {
        if (!isNetworkError(e)) {
          toastError(e, 'Could not stop the timer.');
          return;
        }
        await enqueueAction({
          id: `${target.jobId}:pause:${atIso}`,
          jobId: target.jobId,
          kind: 'pause',
          atIso,
          crew,
        });
        await saveJobCache(target.jobId, { segments: closed });
        dispatch(setPendingJobStatus({ id: target.jobId, status: nextStatus }));
        dispatch(patchJobStatus({ id: target.jobId, status: nextStatus }));
      }
    },
    [dispatch],
  );

  const check = useCallback(async () => {
    if (busyRef.current || promptRef.current || !isLoggedIn) return;
    if (!activeRef.current.length) return;
    if (isOfflineLimitExceeded()) return;

    busyRef.current = true;
    try {
      if (!memberIdRef.current) {
        memberIdRef.current = await getMyMemberRef()
          .then(r => r.id)
          .catch(() => null);
      }
      const me = memberIdRef.current;
      if (!me) return;

      const now = Date.now();
      const toStop: Target[] = [];
      const toRemind: Target[] = [];

      for (const job of activeRef.current) {
        const segments = await fetchJobSegments(job.id).catch(() => null);
        if (!segments) continue;

        const open = segments.find(
          s => s.memberId === me && s.finishTime == null,
        );
        if (!open) continue;

        const startMs = Date.parse(open.startTime);
        const day = shiftDayKey(startMs);
        const stayingOn = await isOvertimeOptIn(job.id, day);
        if (stayingOn && now < shiftCutoffFor(startMs, 1).getTime()) continue;

        const cutoffMs = shiftCutoffFor(startMs, stayingOn ? 1 : 0).getTime();
        const target: Target = {
          jobId: job.id,
          jobLabel: labelFor(job),
          day,
          cutoffMs,
          segments,
        };

        if (now >= cutoffMs) {
          toStop.push(target);
        } else if (
          now >= cutoffMs - SHIFT_REMINDER_LEAD_MS &&
          !(await wasReminded(job.id, day))
        ) {
          toRemind.push(target);
        }
      }

      // One prompt for every job I'm clocked into — starting a job opens a
      // segment for the whole crew, so a lad can be on the clock for several
      // at once without having set foot on any of them.
      if (toStop.length) {
        for (const target of toStop) await forceStop(target, me);
        dispatch(fetchJobs());
        setPrompt({ kind: 'stopped', targets: toStop });
        return;
      }

      if (toRemind.length) {
        for (const target of toRemind) await markReminded(target.jobId, target.day);
        setPrompt({ kind: 'reminder', targets: toRemind });
      }
    } finally {
      busyRef.current = false;
    }
  }, [isLoggedIn, forceStop, dispatch]);

  useEffect(() => {
    if (!isLoggedIn || !activeKey) return;
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') check();
    });
    const offPush = onShiftPush(check);
    return () => {
      clearInterval(id);
      sub.remove();
      offPush();
    };
  }, [isLoggedIn, activeKey, check]);

  useEffect(() => {
    if (!isLoggedIn) memberIdRef.current = null;
  }, [isLoggedIn]);

  const dismiss = () => setPrompt(null);

  const stayOn = async () => {
    if (!prompt) return;
    for (const target of prompt.targets) {
      await setOvertimeOptIn(target.jobId, target.day);
    }
    setPrompt(null);
  };

  const openStopped = () => {
    const targets = prompt?.targets ?? [];
    setPrompt(null);
    if (!navigationRef.isReady() || !targets.length) return;
    if (targets.length === 1) {
      navigationRef.navigate('JobDetail', { jobId: targets[0].jobId });
      return;
    }
    navigationRef.navigate('Tabs', {
      screen: 'Jobs',
      params: { initialTab: 'resume' },
    });
  };

  const submitJob = () => {
    const jobId = prompt?.targets[0]?.jobId;
    setPrompt(null);
    if (jobId && navigationRef.isReady()) {
      navigationRef.navigate('WrapUpJob', { jobId });
    }
  };

  const endLabel = shiftEndLabel();
  const isReminder = prompt?.kind === 'reminder';
  const targets = prompt?.targets ?? [];
  const single = targets.length === 1;

  return (
    <Modal
      visible={prompt !== null}
      transparent
      animationType="fade"
      onRequestClose={isReminder ? dismiss : openStopped}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isReminder ? dismiss : openStopped}
        />
        <View style={[styles.card, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.eyebrow}>
            {isReminder ? 'SHIFT ENDING' : 'TIMER STOPPED'}
          </Text>
          <Text style={styles.title}>
            {isReminder
              ? `Your timer stops at ${endLabel}`
              : `Timer stopped at ${endLabel}`}
          </Text>
          <Text style={styles.body}>
            {isReminder
              ? `You're on the clock for ${namesOf(
                  targets,
                )}. ${single ? 'It' : 'They'} will be paused automatically at ${endLabel} unless you're staying on for overtime.`
              : `${namesOf(targets)} ${
                  single ? 'is' : 'are'
                } on pause. Pick ${
                  single ? 'it' : 'them'
                } up again tomorrow, or submit ${single ? 'it' : 'them'} now.`}
          </Text>

          {targets.length > 1 ? (
            <View style={styles.list}>
              {targets.map(t => (
                <Text key={t.jobId} style={styles.listItem}>
                  {`•  ${t.jobLabel}`}
                </Text>
              ))}
            </View>
          ) : null}

          {isReminder ? (
            <>
              <Pressable style={styles.primaryBtn} onPress={stayOn}>
                <Text style={styles.primaryText}>I’m working overtime</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={dismiss}>
                <Text style={styles.secondaryText}>
                  {`That’s fine, stop at ${endLabel}`}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {single ? (
                <Pressable style={styles.primaryBtn} onPress={submitJob}>
                  <Text style={styles.primaryText}>Submit job now</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.secondaryBtn} onPress={openStopped}>
                <Text style={styles.secondaryText}>
                  {single ? 'Pick it up tomorrow' : 'See paused jobs'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
