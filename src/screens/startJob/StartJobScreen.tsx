import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { Button, Input } from '@/components/ui';
import {
  CheckboxRow,
  CustomerCard,
  RadioCard,
  WizardScaffold,
} from '@/components/wizard';
import { JOB_TYPE_OPTIONS } from '@/data/startJobMock';
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
  addJobPhoto,
  startJob,
  DuplicateCustomerError,
} from '@/services/jobs';
import { searchMaterials, type CatalogMaterial } from '@/services/materials';
import { fetchActiveRoster, type RosterEntry } from '@/services/member';
import { useAppDispatch } from '@/store/hooks';
import { fetchJobs } from '@/store/jobsSlice';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobType, MainStackParamList } from '@/types';

const TOTAL = 5;

const customerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(6, 'Enter a valid phone'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  eircode: z.string().min(1, 'Eircode is required'),
});
type CustomerForm = z.infer<typeof customerSchema>;

type NewCustomerPayload = {
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  eircode: string;
};

type PhotoAsset = { uri: string; base64?: string; type?: string | null };
type CustomerMode = 'list' | 'new' | 'dedup';

const StartJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const dispatch = useAppDispatch();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<CustomerMode>('list');
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string | null>(null);
  const [crew, setCrew] = useState<string[]>([]);
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);
  const [starting, setStarting] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomerPayload | null>(
    null,
  );
  const [candidate, setCandidate] = useState<CandidateCustomer | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [gps, setGps] = useState<GpsPoint | null>(null);
  const [nearest, setNearest] = useState<NearestCustomer | null>(null);

  const [placeCoords, setPlaceCoords] = useState<GpsPoint | null>(null);

  const [materialSearch, setMaterialSearch] = useState('');
  const [catalog, setCatalog] = useState<CatalogMaterial[]>([]);
  const [pickedMaterials, setPickedMaterials] = useState<CatalogMaterial[]>([]);

  useEffect(() => {
    fetchActiveRoster()
      .then(rows => {
        setRoster(rows);
        const me = rows.find(r => r.isSelf);
        if (me) setCrew([me.id]);
      })
      .catch(e => console.warn('roster:', e?.message));

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
    const t = setTimeout(() => {
      searchCustomers(search)
        .then(rows => active && setCustomers(rows))
        .catch(e => console.warn('customers:', e?.message));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search]);

  useEffect(() => {
    if (step !== 4) return;
    let active = true;
    const t = setTimeout(() => {
      searchMaterials(materialSearch)
        .then(rows => active && setCatalog(rows))
        .catch(e => console.warn('materials:', e?.message));
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

  const close = () => navigation.goBack();

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
      eircode: data.eircode,
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

  const openCamera = async () => {
    const res = await launchCamera({
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 1200,
      maxHeight: 1200,
      includeBase64: true,
    });
    if (res.didCancel) return;
    if (res.errorCode) {
      Toast.show({ type: 'error', text1: res.errorMessage ?? 'Camera error.' });
      return;
    }
    const asset = res.assets?.[0];
    setPhoto(
      asset?.uri
        ? { uri: asset.uri, base64: asset.base64, type: asset.type }
        : null,
    );
  };

  const finish = async () => {
    if (starting) return;
    if (!customerId && !newCustomer) {
      Toast.show({ type: 'error', text1: 'Pick a customer first.' });
      setStep(1);
      return;
    }
    setStarting(true);
    try {
      const selfId = roster.find(r => r.isSelf)?.id;
      const memberIds =
        crew.length === 1 && crew[0] === selfId ? [] : crew;

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
          Toast.show({
            type: 'error',
            text1: 'Job started, but some materials failed to log.',
          });
        }
      }

      if (photo?.base64) {
        try {
          await addJobPhoto({
            jobId,
            phase: 'before',
            base64: photo.base64,
            type: photo.type,
          });
        } catch {
          Toast.show({
            type: 'error',
            text1: 'Job started, but the photo failed to upload.',
          });
        }
      }

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
      Toast.show({
        type: 'error',
        text1: e instanceof Error ? e.message : 'Could not start the job.',
      });
    } finally {
      setStarting(false);
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
        {roster.map(m => (
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
        ))}
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
      <Pressable style={styles.photoTile} onPress={openCamera}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photoImg} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
            <Text style={styles.photoText}>Add photo</Text>
          </>
        )}
      </Pressable>
    );
    footer = (
      <View style={styles.gap12}>
        <Button
          label="Open camera"
          leftIcon="camera"
          fullWidth
          disabled={starting}
          onPress={openCamera}
        />
        <Pressable
          onPress={finish}
          hitSlop={8}
          style={styles.skipBtn}
          disabled={starting}
        >
          <Text style={styles.skipText}>
            {starting
              ? 'Starting…'
              : photo
              ? 'Start the job'
              : 'Skip — start the job'}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
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
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    gap16: { gap: 16 },
    gap12: { gap: 12 },
    sectionLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
      marginBottom: 8,
    },
    hintText: {
      marginTop: 10,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    matchCard: {
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      padding: 14,
      gap: 8,
    },
    matchLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    noteBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.md,
      padding: 12,
      marginTop: 4,
    },
    noteText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 19,
    },
    noteStrong: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.semibold,
    },
    photoTile: {
      height: 150,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      overflow: 'hidden',
    },
    photoImg: { width: '100%', height: '100%' },
    photoText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.medium,
    },
    suggestBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      marginTop: -8,
    },
    suggestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    suggestDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    suggestText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
    },
    skipBtn: { alignSelf: 'center', paddingVertical: 4 },
    skipText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
  });

export default StartJobScreen;
