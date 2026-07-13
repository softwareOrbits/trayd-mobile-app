import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { acquirePhotos } from '@/utils/capturePhoto';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { Button, CalendarModal, Input, ImageThumb } from '@/components/ui';
import {
  CheckboxRow,
  CustomerCard,
  RadioCard,
  WizardScaffold,
} from '@/components/wizard';
import { JOB_TYPE_OPTIONS } from '@/utils/constants';
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
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
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
import { fetchActiveRoster, type RosterEntry } from '@/services/member';
import { enqueue, offlineActionBlocked } from '@/offline';
import { useCertGate } from '@/compliance';
import { isNetworkError } from '@/offline/errors';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { addPendingJob } from '@/store/pendingJobsSlice';
import { queueOfflineJob } from '@/offline/jobStartActions';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { withTimeout } from '@/utils/withTimeout';
import { goBackSafe } from '@/utils/navigation';
import { makeStartJobStyles } from '@/styles/startJob.styles';
import {
  START_JOB_TOTAL,
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

const TOTAL = START_JOB_TOTAL;

const StartJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStartJobStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const dispatch = useAppDispatch();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<CustomerMode>('list');
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string | null>(null);
  const [crew, setCrew] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [busy, setBusy] = useState<'start' | 'schedule' | null>(null);
  const [datePicker, setDatePicker] = useState(false);
  const certBlocked = useCertGate();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerPayload | null>(
    null,
  );
  const [candidate, setCandidate] = useState<CandidateCustomer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [gps, setGps] = useState<GpsPoint | null>(null);
  const [nearest, setNearest] = useState<NearestCustomer | null>(null);

  const [placeCoords, setPlaceCoords] = useState<GpsPoint | null>(null);

  const [materialSearch, setMaterialSearch] = useState('');
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [pickedMaterials, setPickedMaterials] = useState<CatalogMaterial[]>([]);

  useEffect(() => {
    fetchActiveRoster()
      .then(rows => {
        setRoster(rows);
        const me = rows.find(r => r.isSelf);
        if (me) setCrew([me.id]);
      })
      .catch(e => console.warn('roster:', e?.message))
      .finally(() => setRosterLoading(false));

    getCurrentPosition().then(p => {
      console.log('[startJob] gps position:', p ?? 'unavailable');
      if (!p) return;
      setGps(p);
      findNearestCustomer(p)
        .then(n => {
          console.log(
            '[startJob] nearest customer:',
            n
              ? `${n.customer.name} · ${Math.round(n.distanceM)}m`
              : 'none with GPS pins within 10km',
          );
          setNearest(n);
        })
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
    if (step !== 4) return;
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
  }, [step, materialSearch]);

  const toggleMaterial = (m: CatalogMaterial) =>
    setPickedMaterials(prev =>
      prev.some(x => x.id === m.id)
        ? prev.filter(x => x.id !== m.id)
        : [...prev, m],
    );

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { fullName: '', phone: '', email: '', address: '', eircode: '' },
  });

  const close = () => goBackSafe(navigation);

  const onBack = () => {
    if (step === 1) {
      if (mode === 'dedup') return setMode('new');
      if (mode === 'new') return setMode('list');
      return close();
    }
    setStep(s => s - 1);
  };

  const pickExisting = (id: string) => {
    setCustomerId(id);
    setNewCustomer(null);
    setMode('list');
    setStep(2);
  };

  const pickNew = (data: CustomerForm) => {
    setNewCustomer({
      name: data.fullName,
      phone: data.phone,
      email: data.email || null,
      address: data.address,
      eircode: normalizeEircode(data.eircode),
    });
    setCustomerId(null);
    setMode('list');
    setStep(2);
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

  const attachMaterialsAndPhotos = async (jobId: string) => {
    if (pickedMaterials.length) {
      const results = await Promise.allSettled(
        pickedMaterials.map(m =>
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

    const pendingPhotos = photos.filter(p => p.uri);
    if (pendingPhotos.length) {
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
    }
  };

  const finish = async () => {
    if (busy) return;
    if (!customerId && !newCustomer) {
      Toast.show({ type: 'error', text1: 'Pick a customer first.' });
      setStep(1);
      return;
    }
    if (certBlocked()) return;
    if (offlineActionBlocked()) return;
    setBusy('start');
    const selfId = roster.find(r => r.isSelf)?.id;
    const memberIds = crew.length === 1 && crew[0] === selfId ? [] : crew;
    try {
      const jobId = await startJob({
        customerId: customerId ?? undefined,
        newCustomer: newCustomer ?? undefined,
        jobType: (jobType ?? 'standard') as JobType,
        memberIds,
        gps: gps ?? undefined,
      });

      if (newCustomer && placeCoords) {
        pinCustomerGps(jobId, placeCoords);
      }

      await attachMaterialsAndPhotos(jobId);

      dispatch(fetchJobs());
      Toast.show({ type: 'success', text1: 'Job started.' });
      navigation.replace('JobDetail', { jobId });
    } catch (e) {
      if (e instanceof DuplicateCustomerError) {
        const existing = await getCustomer(e.existingId).catch(() => null);
        if (existing) {
          setCandidate({
            id: existing.id,
            name: existing.name,
            phone: existing.phone ?? '',
            email: existing.email,
            address: existing.address ?? '',
            eircode: existing.eircode ?? '',
            similarityReason: 'phone_exact',
          });
          setStep(1);
          setMode('dedup');
          return;
        }
      }
      if (isNetworkError(e)) {
        try {
          const picked = customers.find(c => c.id === customerId);
          const customerName =
            newCustomer?.name ??
            picked?.name ??
            candidate?.name ??
            (nearest?.customer.id === customerId
              ? nearest.customer.name
              : undefined) ??
            'Customer';
          const customerAddress =
            newCustomer?.address ??
            picked?.address ??
            candidate?.address ??
            (nearest?.customer.id === customerId
              ? nearest.customer.address
              : null) ??
            null;
          const me = roster.find(r => r.isSelf);
          const crewMembers = crew.map(id => {
            const r = roster.find(m => m.id === id);
            return { id, name: r?.fullName ?? 'Member' };
          });
          const { jobId, job } = await queueOfflineJob({
            customerId: customerId ?? undefined,
            newCustomer: newCustomer ?? undefined,
            customerName,
            customerAddress,
            jobType: (jobType ?? 'standard') as JobType,
            memberIds,
            primaryMemberId: memberIds[0] ?? selfId ?? null,
            memberName: me?.fullName ?? null,
            crew: crewMembers,
            gps: gps ?? null,
            materials: pickedMaterials,
            photos,
          });
          dispatch(addPendingJob(job));
          Toast.show({
            type: 'success',
            text1: 'Saved offline — job syncs when you reconnect.',
          });
          navigation.replace('JobDetail', { jobId });
        } catch {
          Toast.show({
            type: 'info',
            text1: 'You’re offline — start the job when you reconnect.',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: e instanceof Error ? e.message : 'Could not start the job.',
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const resetToScheduled = () =>
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Tabs',
          params: { screen: 'Jobs', params: { initialTab: 'scheduled' } },
        },
      ],
    });

  const openScheduleDate = () => {
    if (busy) return;
    if (!customerId && !newCustomer) {
      Toast.show({ type: 'error', text1: 'Pick a customer first.' });
      setStep(1);
      return;
    }
    setDatePicker(true);
  };

  // A scheduled job with no date is invisible everywhere that groups by day —
  // it fell into an "Unscheduled" bucket and never reached the dashboard.
  const scheduleAndClose = async (scheduledDate: string) => {
    if (busy) return;
    if (offlineActionBlocked()) return;
    setBusy('schedule');
    const selfId = roster.find(r => r.isSelf)?.id;
    const memberIds = crew.length === 1 && crew[0] === selfId ? [] : crew;
    try {
      const jobId = await scheduleJob({
        customerId: customerId ?? undefined,
        newCustomer: newCustomer ?? undefined,
        jobType: (jobType ?? 'standard') as JobType,
        memberIds,
        gps: gps ?? undefined,
        scheduledDate,
      });
      if (newCustomer && placeCoords) {
        pinCustomerGps(jobId, placeCoords);
      }
      await attachMaterialsAndPhotos(jobId);
      dispatch(fetchJobs());
      Toast.show({ type: 'success', text1: 'Job saved & scheduled.' });
      resetToScheduled();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not save the job.',
      });
    } finally {
      setBusy(null);
    }
  };

  // ----- per-view content -----
  let title = '';
  let subtitle: string | undefined;
  let bodyContent: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (step === 1 && mode === 'list') {
    title = "Who's this job for?";
    bodyContent = (
      <View style={styles.gap16}>
        <Input
          placeholder="Search by name or phone…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {nearest ? (
          <View>
            <Text style={styles.sectionLabel}>NEAREST · GPS</Text>
            <CustomerCard
              name={nearest.customer.name}
              address={[nearest.customer.address, nearest.customer.eircode]
                .filter(Boolean)
                .join(' · ')}
              meta={`${formatDistance(nearest.distanceM)} away · ${
                nearest.priorJobs
              } prior job${nearest.priorJobs === 1 ? '' : 's'}`}
              highlighted
              onUse={() => pickExisting(nearest.customer.id)}
            />
            <Text style={styles.hintText}>
              No GPS? You can still search or add new — nothing&apos;s blocked.
            </Text>
          </View>
        ) : null}
        <View>
          <Text style={styles.sectionLabel}>RECENT</Text>
          {customersLoading && !customers.length ? (
            <ActivityIndicator
              color={colors.secondary}
              style={styles.listLoader}
            />
          ) : (
            <>
              {customers.map(c => (
                <CustomerCard
                  key={c.id}
                  name={c.name}
                  meta={[c.eircode, c.phone].filter(Boolean).join(' · ')}
                  onPress={() => pickExisting(c.id)}
                />
              ))}
              {!customers.length ? (
                <Text style={styles.hintText}>
                  No customers yet — add your first one below.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </View>
    );
    footer = (
      <Button
        label="Add a new customer"
        leftIcon="add"
        variant="outlined"
        color="secondary"
        fullWidth
        onPress={() => setMode('new')}
      />
    );
  } else if (step === 1 && mode === 'new') {
    title = 'New customer.';
    bodyContent = (
      <View style={styles.gap16}>
        <Controller
          control={form.control}
          name="fullName"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Full name *"
              placeholder="e.g. John Murphy"
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
              label="Phone *"
              placeholder="+353 …"
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
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Email (optional)"
              placeholder="optional"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.email?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="address"
          render={({ field: { value, onChange } }) => (
            <AddressAutocomplete
              label="Address *"
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
              label="Eircode *"
              placeholder="e.g. V94 X2P1"
              autoCapitalize="characters"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.eircode?.message}
            />
          )}
        />
        <Text style={styles.hintText}>Pre-filled from GPS — editable.</Text>
      </View>
    );
    footer = (
      <Button
        label="Save customer"
        color="secondary"
        leftIcon="checkmark"
        fullWidth
        onPress={onSaveNew}
      />
    );
  } else if (step === 1 && mode === 'dedup' && candidate) {
    const firstName = candidate.name.split(' ')[0];
    title = `Hold on — is this ${firstName}?`;
    subtitle =
      'We match by phone to keep your customers tidy — same number means same person, even if a name was typed differently.';
    bodyContent = (
      <View style={styles.matchCard}>
        <Text style={styles.matchLabel}>PHONE NUMBER ALREADY ON FILE</Text>
        <CustomerCard
          name={candidate.name}
          address={[candidate.address, candidate.phone]
            .filter(Boolean)
            .join(' · ')}
          meta={candidate.eircode}
        />
      </View>
    );
    footer = (
      <View style={styles.gap12}>
        <Button
          label={`Yes — use existing ${candidate.name}`}
          fullWidth
          onPress={() => pickExisting(candidate.id)}
        />
        <Button
          label="No — create a new customer"
          variant="outlined"
          color="secondary"
          fullWidth
          onPress={() => pickNew(form.getValues())}
        />
      </View>
    );
  } else if (step === 2) {
    title = 'What kind of job?';
    bodyContent = (
      <View style={styles.gap12}>
        {JOB_TYPE_OPTIONS.map(opt => (
          <RadioCard
            key={opt.key}
            icon={opt.icon}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={jobType === opt.key}
            onPress={() => setJobType(opt.key)}
          />
        ))}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Multi-day isn&apos;t chosen here — at the end of the day just tap{' '}
            <Text style={styles.noteStrong}>Continue tomorrow</Text> instead of
            Finish.
          </Text>
        </View>
      </View>
    );
    footer = (
      <Button
        label="Continue"
        color="secondary"
        fullWidth
        disabled={!jobType}
        onPress={() => setStep(3)}
      />
    );
  } else if (step === 3) {
    title = "Who's on site today?";
    subtitle = 'Tap to add or remove. Single-tap "Just me" if you\'re alone.';
    bodyContent = (
      <View style={styles.gap12}>
        <Button
          label="Just me — skip ahead"
          variant="outlined"
          color="secondary"
          fullWidth
          onPress={() => {
            const me = roster.find(r => r.isSelf);
            setCrew(me ? [me.id] : []);
            setStep(4);
          }}
        />
        {rosterLoading && !roster.length ? (
          <ActivityIndicator
            color={colors.secondary}
            style={styles.listLoader}
          />
        ) : (
          roster.map(m => (
            <CheckboxRow
              key={m.id}
              name={m.fullName ?? m.email ?? 'Member'}
              role={
                m.isSelf
                  ? [m.roleName ?? 'Member', 'you'].join(' · ')
                  : m.roleName ?? ''
              }
              selected={crew.includes(m.id)}
              onPress={() => toggleCrew(m.id)}
            />
          ))
        )}
      </View>
    );
    footer = (
      <Button
        label={`${crew.length} on site — continue`}
        fullWidth
        disabled={crew.length === 0}
        onPress={() => setStep(4)}
      />
    );
  } else if (step === 4) {
    title = 'Anything off the van?';
    subtitle =
      'Tap to add van stock — you can adjust or add more during the job.';
    bodyContent = (
      <View style={styles.gap12}>
        <Input
          placeholder="Search materials…"
          value={materialSearch}
          onChangeText={setMaterialSearch}
          autoCapitalize="none"
        />
        {materialsLoading && !catalog.length ? (
          <ActivityIndicator
            color={colors.secondary}
            style={styles.listLoader}
          />
        ) : (
          <>
            {catalog.map(m => (
              <CheckboxRow
                key={m.id}
                name={m.name}
                role={[`€${m.sellPrice.toFixed(2)}`, m.unit]
                  .filter(Boolean)
                  .join(' · ')}
                selected={pickedMaterials.some(x => x.id === m.id)}
                onPress={() => toggleMaterial(m)}
              />
            ))}
            {!catalog.length ? (
              <Text style={styles.hintText}>
                No materials found — try a different search.
              </Text>
            ) : null}
          </>
        )}
      </View>
    );
    footer = (
      <Button
        label={
          pickedMaterials.length
            ? `${pickedMaterials.length} item${
                pickedMaterials.length === 1 ? '' : 's'
              } — continue`
            : 'Continue'
        }
        fullWidth
        onPress={() => setStep(5)}
      />
    );
  } else {
    title = 'Snap before photos.';
    subtitle =
      'Two or three photos of the existing state. They protect both sides if something’s queried.';
    bodyContent = (
      <View style={styles.photoGrid}>
        {photos.map((p, i) => (
          <ImageThumb key={p.uri} uri={p.uri} onRemove={() => removePhoto(i)} />
        ))}
        <Pressable style={styles.photoAddTile} onPress={addPhotos}>
          <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
          <Text style={styles.photoText}>
            {photos.length ? 'Add another' : 'Add photo'}
          </Text>
        </Pressable>
      </View>
    );
    footer = (
      <View style={styles.gap12}>
        <Button
          label={photos.length ? 'Add another photo' : 'Add photos'}
          leftIcon="camera"
          variant="outlined"
          fullWidth
          disabled={!!busy}
          onPress={addPhotos}
        />
        <Button
          label="Start job now"
          fullWidth
          loading={busy === 'start'}
          disabled={!!busy}
          onPress={finish}
        />
        <Button
          label="Save & schedule"
          variant="outlined"
          color="secondary"
          fullWidth
          loading={busy === 'schedule'}
          disabled={!!busy}
          onPress={openScheduleDate}
        />
      </View>
    );
  }

  return (
    <>
      <WizardScaffold
        step={step}
        total={TOTAL}
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        onCancel={close}
        footer={footer}
      >
        {bodyContent}
      </WizardScaffold>
      <CalendarModal
        visible={datePicker}
        value={null}
        title="Schedule this job for"
        onSelect={date => {
          setDatePicker(false);
          scheduleAndClose(date);
        }}
        onClose={() => setDatePicker(false)}
      />
    </>
  );
};

export default StartJobScreen;
