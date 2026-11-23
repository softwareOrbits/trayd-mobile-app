import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import {
  AppToast,
  Button,
  CalendarModal,
  FilePreview,
  Input,
  JobFooter,
  useFilePreview,
} from '@/components/ui';
import { CustomerCard } from '@/components/wizard';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { acquirePhotos } from '@/utils/capturePhoto';
import { JOB_TYPE_OPTIONS, HALF_HOUR_TIME_OPTIONS } from '@/utils/constants';
import { fmtDateWeekday } from '@/utils/datetime';
import {
  findNearestCustomer,
  findSimilarCustomers,
  getCustomer,
  pinCustomerGps,
  searchCustomers,
  type CandidateCustomer,
  type Customer,
  type NearestCustomer,
} from '@/services/customers';
import {
  formatDistance,
  getCurrentPosition,
  type GpsPoint,
} from '@/utils/location';
import {
  addJobMaterial,
  addJobPhotos,
  startJob,
  scheduleJob,
  DuplicateCustomerError,
} from '@/services/jobs';
import { searchMaterials, type CatalogMaterial } from '@/services/materials';
import {
  fetchActiveRoster,
  getMyMemberRef,
  type RosterEntry,
} from '@/services/member';
import { enqueue, offlineActionBlocked } from '@/offline';
import { isNetworkError } from '@/offline/errors';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { addPendingJob } from '@/store/pendingJobsSlice';
import { queueOfflineJob } from '@/offline/jobStartActions';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { withTimeout } from '@/utils/withTimeout';
import { goBackSafe } from '@/utils/navigation';
import { makeNewJobStyles } from '@/styles/newJob.styles';
import {
  PHOTO_UPLOAD_TIMEOUT_MS,
  customerSchema,
  normalizeEircode,
  type CustomerForm,
} from '@/components/startJob/helpers';
import type {
  CustomerMode,
  NewCustomerPayload,
  PhotoAsset,
} from '@/components/startJob/types';
import type { JobType, MainStackParamList } from '@/types';

type When = 'now' | 'schedule' | 'nodate';

const SHORT_TYPE: Record<string, string> = {
  standard: 'Standard',
  quote: 'Quote visit',
  callout: 'Call-out',
};

const WHEN_OPTIONS = [
  ['now', 'play', 'Start now'],
  ['schedule', 'calendar-outline', 'Schedule'],
  ['nodate', 'reorder-three-outline', 'No date'],
] as const;

const firstName = (name: string | null) =>
  (name ?? '').trim().split(/\s+/)[0] || 'Member';

const shortDate = (iso: string) => fmtDateWeekday(iso).replace(/\/\d{4}$/, '');

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' · ');

const StartJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeNewJobStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'StartJob'>>();
  const dispatch = useAppDispatch();

  const [mode, setMode] = useState<CustomerMode>('list');
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<JobType>('standard');
  const [crew, setCrew] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const preview = useFilePreview();
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState<When>(
    route.params?.intent === 'plan' ? 'schedule' : 'now',
  );
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [datePicker, setDatePicker] = useState(false);
  const [timeSheet, setTimeSheet] = useState(false);
  const [matSheet, setMatSheet] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerPayload | null>(
    null,
  );
  const [picked, setPicked] = useState<{ name: string; sub: string } | null>(
    null,
  );
  const [candidate, setCandidate] = useState<CandidateCustomer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [gps, setGps] = useState<GpsPoint | null>(null);
  const [nearest, setNearest] = useState<NearestCustomer | null>(null);
  const [placeCoords, setPlaceCoords] = useState<GpsPoint | null>(null);

  const [materialSearch, setMaterialSearch] = useState('');
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [pickedMaterials, setPickedMaterials] = useState<CatalogMaterial[]>([]);

  useEffect(() => {
    getMyMemberRef()
      .then(r => setMyMemberId(r.id))
      .catch(() => {});

    fetchActiveRoster()
      .then(rows => {
        setRoster(rows);
        const me = rows.find(r => r.isSelf);
        if (me) setCrew([me.id]);
      })
      .catch(e => console.warn('roster:', e?.message))
      .finally(() => setRosterLoading(false));

    getCurrentPosition().then(p => {
      if (!p) return;
      setGps(p);
      findNearestCustomer(p)
        .then(setNearest)
        .catch(e => console.warn('nearest customer:', e?.message));
    });
  }, []);

  useEffect(() => {
    let active = true;
    setCustomersLoading(true);
    const t = setTimeout(() => {
      searchCustomers(search)
        .then(rows => active && setCustomers(rows))
        .catch(e => console.warn('customers:', e?.message))
        .finally(() => active && setCustomersLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

  useEffect(() => {
    if (!matSheet) return;
    let active = true;
    setMaterialsLoading(true);
    const t = setTimeout(() => {
      searchMaterials(materialSearch)
        .then(rows => active && setCatalog(rows))
        .catch(e => console.warn('materials:', e?.message))
        .finally(() => active && setMaterialsLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [matSheet, materialSearch]);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      address: '',
      eircode: '',
    },
  });

  const close = () => goBackSafe(navigation);

  const selfId = roster.find(r => r.isSelf)?.id ?? myMemberId ?? undefined;
  const selfOnCrew = !!selfId && crew.includes(selfId);
  const effectiveWhen: When = when === 'now' && !selfOnCrew ? 'schedule' : when;
  const hasCustomer = !!customerId || !!newCustomer;
  const crewOk = crew.length > 0;
  const scheduleOk = effectiveWhen !== 'schedule' || (!!date && !!time);
  const ready = hasCustomer && crewOk && scheduleOk;
  const why = !hasCustomer
    ? 'Pick a customer to continue.'
    : !crewOk
    ? 'Add someone on site.'
    : !scheduleOk
    ? 'Pick a date and start time.'
    : null;

  const listedCustomers = useMemo(() => {
    const rows = search.trim()
      ? customers
      : customers.filter(c => c.id !== nearest?.customer.id);
    return search.trim() ? rows : rows.slice(0, 4);
  }, [customers, search, nearest]);

  const pickExisting = (id: string, name: string, sub: string) => {
    setCustomerId(id);
    setNewCustomer(null);
    setPicked({ name, sub });
    setSearch('');
    setMode('list');
  };

  const pickNew = (data: CustomerForm) => {
    const eircode = normalizeEircode(data.eircode);
    setNewCustomer({
      name: data.fullName,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      eircode,
    });
    setCustomerId(null);
    setPicked({ name: data.fullName, sub: joinParts(data.address, eircode) });
    setMode('list');
  };

  const changeCustomer = () => {
    setCustomerId(null);
    setNewCustomer(null);
    setPicked(null);
    setMode('list');
  };

  const onSaveNew = form.handleSubmit(async data => {
    try {
      const matches = await findSimilarCustomers(data.phone, data.fullName);
      if (matches.length) {
        setCandidate(matches[0]);
        setMode('dedup');
        return;
      }
    } catch (e) {
      console.warn('find_similar_customers:', e);
    }
    pickNew(data);
  });

  const toggleCrew = (id: string) =>
    setCrew(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );

  const toggleMaterial = (m: CatalogMaterial) =>
    setPickedMaterials(prev =>
      prev.some(x => x.id === m.id)
        ? prev.filter(x => x.id !== m.id)
        : [...prev, m],
    );

  const addPhotos = async () => {
    const assets = await acquirePhotos({
      quality: 0.7,
      maxSize: 1200,
      selectionLimit: 6,
    });
    if (assets.length) setPhotos(prev => [...prev, ...assets]);
  };

  const removePhoto = (idx: number) =>
    setPhotos(prev => prev.filter((_, i) => i !== idx));

  const materialsToLog = jobType === 'quote' ? [] : pickedMaterials;
  const photosToLog = effectiveWhen === 'now' ? photos : [];

  const attachMaterialsAndPhotos = async (jobId: string) => {
    if (materialsToLog.length) {
      const results = await Promise.allSettled(
        materialsToLog.map(m =>
          addJobMaterial({
            jobId,
            description: m.name,
            quantity: 1,
            unitCost: m.sellPrice,
            source: 'van_stock',
            unit: m.unit,
          }),
        ),
      );
      if (results.some(r => r.status === 'rejected')) {
        Toast.show({ type: 'error', text1: 'Some materials failed to log.' });
      }
    }

    const pendingPhotos = photosToLog.filter(p => p.uri);
    if (!pendingPhotos.length) return;
    const stamp = Date.now();
    const items = pendingPhotos.map((p, i) => ({
      phase: 'before' as const,
      uri: p.uri,
      base64: p.base64,
      type: p.type,
      clientKey: `${jobId}-${stamp}-${i}`,
    }));
    const queuePhotosOffline = () =>
      enqueue({
        id: `${jobId}:photos:${stamp}`,
        kind: 'job.addPhotos',
        payload: { clientId: `${jobId}-${stamp}`, jobId, photos: items },
      });
    try {
      const { uploaded, failed } = await withTimeout(
        addJobPhotos({ jobId, photos: items }),
        PHOTO_UPLOAD_TIMEOUT_MS,
      );
      if (!uploaded) {
        await queuePhotosOffline();
      } else if (failed) {
        Toast.show({
          type: 'error',
          text1: `${failed} photo${failed === 1 ? '' : 's'} didn’t upload.`,
        });
      }
    } catch (photoErr) {
      if (isNetworkError(photoErr)) {
        await queuePhotosOffline();
      } else {
        Toast.show({ type: 'error', text1: 'The photos didn’t upload.' });
      }
    }
  };

  const crewMemberIds = () =>
    crew.length === 1 && crew[0] === selfId ? [] : crew;

  const showDuplicate = async (existingId: string) => {
    const existing = await getCustomer(existingId).catch(() => null);
    if (!existing) return false;
    setCandidate({
      id: existing.id,
      name: existing.name,
      phone: existing.phone ?? '',
      email: existing.email,
      address: existing.address ?? '',
      eircode: existing.eircode ?? '',
      similarityReason: 'phone_exact',
    });
    setCustomerId(null);
    setNewCustomer(null);
    setPicked(null);
    setMode('dedup');
    return true;
  };

  const startNow = async () => {
    const memberIds = crewMemberIds();
    try {
      const jobId = await startJob({
        customerId: customerId ?? undefined,
        newCustomer: newCustomer ?? undefined,
        jobType,
        memberIds,
        gps: gps ?? undefined,
      });
      if (newCustomer && placeCoords) pinCustomerGps(jobId, placeCoords);
      await attachMaterialsAndPhotos(jobId);
      dispatch(fetchJobs());
      Toast.show({
        type: 'success',
        text1: 'Job started.',
        text2: 'Your timer is running.',
      });
      navigation.replace('JobDetail', { jobId });
    } catch (e) {
      if (
        e instanceof DuplicateCustomerError &&
        (await showDuplicate(e.existingId))
      ) {
        return;
      }
      if (!isNetworkError(e)) {
        Toast.show({
          type: 'error',
          text1: e instanceof Error ? e.message : 'Could not start the job.',
        });
        return;
      }
      try {
        const me = roster.find(r => r.isSelf);
        const { jobId, job } = await queueOfflineJob({
          customerId: customerId ?? undefined,
          newCustomer: newCustomer ?? undefined,
          customerName: picked?.name ?? 'Customer',
          customerAddress: newCustomer?.address ?? picked?.sub ?? null,
          jobType,
          memberIds,
          primaryMemberId: memberIds[0] ?? selfId ?? null,
          memberName: me?.fullName ?? null,
          crew: crew.map(id => ({
            id,
            name: roster.find(m => m.id === id)?.fullName ?? 'Member',
          })),
          gps: gps ?? null,
          materials: materialsToLog,
          photos: photosToLog,
        });
        dispatch(addPendingJob(job));
        Toast.show({
          type: 'success',
          text1: 'Saved offline.',
          text2: 'The job syncs when you reconnect.',
        });
        navigation.replace('JobDetail', { jobId });
      } catch {
        Toast.show({
          type: 'info',
          text1: 'You’re offline.',
          text2: 'Start the job when you reconnect.',
        });
      }
    }
  };

  const saveForLater = async () => {
    const scheduled = effectiveWhen === 'schedule' ? date : null;
    try {
      const jobId = await scheduleJob({
        customerId: customerId ?? undefined,
        newCustomer: newCustomer ?? undefined,
        jobType,
        memberIds: crewMemberIds(),
        gps: gps ?? undefined,
        scheduledDate: scheduled,
        scheduledStartTime: scheduled && time ? `${time}:00` : null,
      });
      if (newCustomer && placeCoords) pinCustomerGps(jobId, placeCoords);
      await attachMaterialsAndPhotos(jobId);
      dispatch(fetchJobs());
      Toast.show(
        scheduled
          ? {
              type: 'success',
              text1: 'Job scheduled.',
              text2: joinParts(fmtDateWeekday(scheduled), time),
            }
          : {
              type: 'success',
              text1: 'Job saved.',
              text2: 'Find it under Unscheduled.',
            },
      );
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Tabs',
            params: { screen: 'Jobs', params: { initialTab: 'scheduled' } },
          },
        ],
      });
    } catch (e) {
      if (
        e instanceof DuplicateCustomerError &&
        (await showDuplicate(e.existingId))
      ) {
        return;
      }
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not save the job.',
      });
    }
  };

  const submit = async () => {
    if (busy || !ready) return;
    if (offlineActionBlocked()) return;
    setBusy(true);
    try {
      if (effectiveWhen === 'now') await startNow();
      else await saveForLater();
    } finally {
      setBusy(false);
    }
  };

  const chooseWhen = (next: When) => {
    if (next === 'now' && !selfOnCrew) return;
    setWhen(next);
    if (next === 'schedule' && !date) setDatePicker(true);
  };

  const initial = (name: string | null | undefined, size = 38) => (
    <View
      style={[
        styles.av,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avText}>
        {(name ?? '?').trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );

  const label = (text: string, extra?: string, first?: boolean) => (
    <Text style={[styles.label, first && styles.labelFirst]}>
      {text}
      {extra ? <Text style={styles.labelExtra}>{` · ${extra}`}</Text> : null}
    </Text>
  );

  let customerSection: React.ReactNode;
  if (picked && hasCustomer) {
    customerSection = (
      <View style={styles.gap8}>
        <View style={[styles.cust, styles.custPicked]}>
          {initial(picked.name)}
          <View style={styles.ci}>
            <Text style={styles.custName} numberOfLines={1}>
              {picked.name}
            </Text>
            <Text style={styles.custSub} numberOfLines={1}>
              {picked.sub}
            </Text>
          </View>
          <Pressable onPress={changeCustomer} hitSlop={8}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        </View>
      </View>
    );
  } else if (mode === 'dedup' && candidate) {
    customerSection = (
      <View style={styles.gap8}>
        <View style={styles.matchCard}>
          <Text style={styles.matchTitle}>
            {`Is this ${firstName(candidate.name)}?`}
          </Text>
          <Text style={styles.matchText}>
            That phone number is already on file. Same number means same
            person.
          </Text>
          <CustomerCard
            name={candidate.name}
            address={joinParts(candidate.address, candidate.phone)}
            meta={candidate.eircode}
          />
          <Button
            label={`Use ${candidate.name}`}
            fullWidth
            onPress={() =>
              pickExisting(
                candidate.id,
                candidate.name,
                joinParts(candidate.address, candidate.eircode),
              )
            }
          />
          <Button
            label="No, create a new customer"
            variant="outlined"
            color="secondary"
            fullWidth
            onPress={() => pickNew(form.getValues())}
          />
        </View>
      </View>
    );
  } else if (mode === 'new') {
    customerSection = (
      <View style={styles.gap8}>
        <Controller
          control={form.control}
          name="fullName"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              placeholder="Full name *"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="phone"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              placeholder="Phone * (+353 …)"
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.phone?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="address"
          render={({ field: { value, onChange } }) => (
            <AddressAutocomplete
              label=""
              value={value}
              error={form.formState.errors.address?.message}
              onChangeText={t => {
                onChange(t);
                setPlaceCoords(null);
              }}
              onSelect={d => {
                onChange(d.address);
                if (d.eircode) {
                  form.setValue('eircode', d.eircode, { shouldValidate: true });
                }
                setPlaceCoords({ lat: d.lat, lng: d.lng });
              }}
            />
          )}
        />
        <Controller
          control={form.control}
          name="eircode"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              placeholder="Eircode * (e.g. V94 X2P1)"
              autoCapitalize="characters"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.eircode?.message}
            />
          )}
        />
        <View style={styles.twoCol}>
          <View style={styles.flex1}>
            <Button
              label="Cancel"
              variant="outlined"
              color="secondary"
              size="md"
              fullWidth
              onPress={() => setMode('list')}
            />
          </View>
          <View style={styles.flex1}>
            <Button
              label="Save customer"
              color="secondary"
              size="md"
              fullWidth
              onPress={onSaveNew}
            />
          </View>
        </View>
      </View>
    );
  } else {
    customerSection = (
      <View style={styles.gap8}>
        <TextInput
          style={styles.input}
          placeholder="Search by name or phone…"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {nearest && !search.trim() ? (
          <Pressable
            style={[styles.cust, styles.custHl]}
            onPress={() =>
              pickExisting(
                nearest.customer.id,
                nearest.customer.name,
                joinParts(nearest.customer.address, nearest.customer.eircode),
              )
            }
          >
            {initial(nearest.customer.name)}
            <View style={styles.ci}>
              <Text style={styles.custName} numberOfLines={1}>
                {nearest.customer.name}
              </Text>
              <Text style={styles.custSub} numberOfLines={1}>
                {joinParts(nearest.customer.address, nearest.customer.eircode)}
              </Text>
              <Text style={styles.near} numberOfLines={1}>
                {joinParts(
                  `${formatDistance(nearest.distanceM)} away`,
                  `${nearest.priorJobs} prior job${
                    nearest.priorJobs === 1 ? '' : 's'
                  }`,
                )}
              </Text>
            </View>
            <View style={styles.use}>
              <Text style={styles.useText}>Use</Text>
            </View>
          </Pressable>
        ) : null}
        {customersLoading && !customers.length ? (
          <ActivityIndicator color={colors.secondary} style={styles.loader} />
        ) : (
          listedCustomers.map(c => (
            <Pressable
              key={c.id}
              style={styles.cust}
              onPress={() =>
                pickExisting(c.id, c.name, joinParts(c.address, c.eircode))
              }
            >
              {initial(c.name)}
              <View style={styles.ci}>
                <Text style={styles.custName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.custSub} numberOfLines={1}>
                  {joinParts(c.eircode, c.phone)}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.secondary}
              />
            </Pressable>
          ))
        )}
        {search.trim() && !customersLoading && !listedCustomers.length ? (
          <Text style={styles.hint}>No customers found.</Text>
        ) : null}
        <Pressable style={styles.addNew} onPress={() => setMode('new')}>
          <Ionicons name="add" size={18} color={colors.secondary} />
          <Text style={styles.addNewText}>Add a new customer</Text>
        </Pressable>
      </View>
    );
  }

  const typeHint =
    JOB_TYPE_OPTIONS.find(o => o.key === jobType)?.subtitle ?? '';

  const primaryLabel =
    effectiveWhen === 'now'
      ? 'Start job now'
      : effectiveWhen === 'schedule'
        ? date && time
          ? `Schedule · ${shortDate(date)} · ${time}`
          : 'Schedule job'
        : 'Save without a date';
  const primaryIcon =
    effectiveWhen === 'now'
      ? 'play'
      : effectiveWhen === 'schedule'
        ? 'calendar-outline'
        : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.back}
          onPress={close}
          hitSlop={8}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={styles.topTitle}>New job</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {label(
          mode === 'new' && !hasCustomer ? 'New customer' : 'Customer',
          undefined,
          true,
        )}
        {customerSection}

        {label('Job type')}
        <View style={styles.chips3}>
          {JOB_TYPE_OPTIONS.map(opt => {
            const on = jobType === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.tchip, on && styles.tchipOn]}
                onPress={() => setJobType(opt.key)}
                accessibilityState={{ selected: on }}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={on ? colors.primary : colors.secondary}
                />
                <Text style={[styles.tchipText, on && styles.tchipTextOn]}>
                  {SHORT_TYPE[opt.key] ?? opt.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{typeHint}</Text>

        {label('On site')}
        {rosterLoading && !roster.length ? (
          <ActivityIndicator color={colors.secondary} style={styles.loader} />
        ) : (
          <View style={styles.pchips}>
            {roster.map(m => {
              const on = crew.includes(m.id);
              const name = m.fullName ?? m.email ?? 'Member';
              return (
                <Pressable
                  key={m.id}
                  style={[styles.pchip, on && styles.pchipOn]}
                  onPress={() => toggleCrew(m.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.pav, on && styles.pavOn]}>
                    <Text style={[styles.pavText, on && styles.pavTextOn]}>
                      {name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.pchipText, on && styles.pchipTextOn]}>
                    {m.isSelf ? 'Me' : firstName(name)}
                  </Text>
                  {on ? (
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {jobType === 'quote' ? null : (
          <>
            {label('Off the van', 'optional')}
            {pickedMaterials.length ? (
              <View style={styles.pchips}>
                {pickedMaterials.map(m => (
                  <View key={m.id} style={styles.mchip}>
                    <Text style={styles.mchipText} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Pressable
                      style={styles.mchipX}
                      onPress={() => toggleMaterial(m)}
                      accessibilityLabel={`Remove ${m.name}`}
                    >
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable style={styles.addPill} onPress={() => setMatSheet(true)}>
              <Ionicons name="add" size={18} color={colors.secondary} />
              <Text style={styles.addPillText}>
                {pickedMaterials.length ? 'Add more' : 'Add materials'}
              </Text>
            </Pressable>
          </>
        )}

        {label('When')}
        <View style={styles.when}>
          {WHEN_OPTIONS.map(([key, icon, text]) => {
            const on = effectiveWhen === key;
            const off = key === 'now' && !selfOnCrew;
            return (
              <Pressable
                key={key}
                disabled={off}
                style={[
                  styles.whenBtn,
                  on && styles.whenBtnOn,
                  off && styles.whenBtnOff,
                ]}
                onPress={() => chooseWhen(key)}
                accessibilityState={{ selected: on, disabled: off }}
              >
                <Ionicons name={icon} size={16} color={colors.secondary} />
                <Text style={styles.whenText}>{text}</Text>
              </Pressable>
            );
          })}
        </View>
        {!selfOnCrew ? (
          <Text style={styles.hint}>Add yourself on site to start it now.</Text>
        ) : null}
        {effectiveWhen === 'schedule' ? (
          <View style={styles.pills2}>
            <Pressable
              style={[styles.pillbtn, styles.pillWide]}
              onPress={() => setDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.secondary}
              />
              <Text
                style={date ? styles.pillValue : styles.pillPlaceholder}
                numberOfLines={1}
              >
                {date ? fmtDateWeekday(date) : 'Date *'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pillbtn, styles.pillNarrow]}
              onPress={() => setTimeSheet(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.secondary} />
              <Text style={time ? styles.pillValue : styles.pillPlaceholder}>
                {time ?? 'Start time *'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {effectiveWhen === 'now' ? (
          <>
            {label(
              'Before photos',
              photos.length >= 2 ? `${photos.length} added` : '2–3 suggested',
            )}
            <View style={styles.grid}>
              {photos.map((p, i) => (
                <Pressable
                  key={p.uri}
                  style={styles.tile}
                  onPress={() =>
                    preview.open(
                      photos.map(x => ({ uri: x.uri, label: 'Before photo' })),
                      i,
                    )
                  }
                >
                  <Image source={{ uri: p.uri }} style={styles.tileImg} />
                  <View style={styles.tileTag}>
                    <Text style={styles.tileTagText}>{`BEFORE ${i + 1}`}</Text>
                  </View>
                  <Pressable
                    style={styles.tileX}
                    onPress={() => removePhoto(i)}
                    hitSlop={6}
                    accessibilityLabel="Remove photo"
                  >
                    <Ionicons name="close" size={15} color={colors.white} />
                  </Pressable>
                </Pressable>
              ))}
              <Pressable
                style={[styles.tile, styles.tileAdd]}
                onPress={addPhotos}
              >
                <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                <Text style={styles.tileAddText}>
                  {photos.length ? 'Add' : 'Add photo'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.hint}>
              Two or three photos of the existing state protect both sides if
              something’s queried.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <JobFooter>
        {why ? <Text style={styles.why}>{why}</Text> : null}
        <Button
          label={primaryLabel}
          leftIcon={primaryIcon}
          fullWidth
          loading={busy}
          disabled={!ready || busy}
          onPress={submit}
        />
      </JobFooter>

      <CalendarModal
        visible={datePicker}
        value={date}
        title="Schedule this job for"
        onSelect={d => {
          setDatePicker(false);
          setDate(d);
          if (!time) setTimeSheet(true);
        }}
        onClose={() => setDatePicker(false)}
      />

      <Modal
        visible={timeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTimeSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>Start time</Text>
            <ScrollView>
              <View style={styles.times}>
                {HALF_HOUR_TIME_OPTIONS.map(t => {
                  const on = t === time;
                  return (
                    <Pressable
                      key={t}
                      style={[styles.timeBtn, on && styles.timeBtnOn]}
                      onPress={() => {
                        setTime(t);
                        setTimeSheet(false);
                      }}
                    >
                      <Text style={[styles.timeText, on && styles.timeTextOn]}>
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={matSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setMatSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMatSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.grab} />
            <Text style={styles.sheetTitle}>Anything off the van?</Text>
            <Text style={styles.sheetSub}>
              Tap to add van stock. You can adjust it during the job.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Search materials…"
              placeholderTextColor={colors.placeholder}
              value={materialSearch}
              onChangeText={setMaterialSearch}
              autoCapitalize="none"
            />
            <ScrollView
              style={styles.sheetList}
              keyboardShouldPersistTaps="handled"
            >
              {materialsLoading && !catalog.length ? (
                <ActivityIndicator
                  color={colors.secondary}
                  style={styles.loader}
                />
              ) : catalog.length ? (
                catalog.map(m => {
                  const on = pickedMaterials.some(x => x.id === m.id);
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.matRow, on && styles.matRowOn]}
                      onPress={() => toggleMaterial(m)}
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={styles.matName}>{m.name}</Text>
                      <Text style={styles.matPrice}>
                        {`€${m.sellPrice.toFixed(2)}${
                          m.unit ? `\n${m.unit}` : ''
                        }`}
                      </Text>
                      <View style={[styles.tick, on && styles.tickOn]}>
                        {on ? (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={colors.white}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text style={styles.hint}>
                  No materials found. Try a different search.
                </Text>
              )}
            </ScrollView>
            <Button
              label={
                pickedMaterials.length
                  ? `Done · ${pickedMaterials.length} item${
                      pickedMaterials.length === 1 ? '' : 's'
                    }`
                  : 'Done'
              }
              fullWidth
              onPress={() => setMatSheet(false)}
            />
          </View>
        </View>
      </Modal>

      <FilePreview {...preview.props} />
      <AppToast />
    </KeyboardAvoidingView>
  );
};

export default StartJobScreen;
