import { useState } from 'react';
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
import {
  CREW,
  DEDUP_MATCH,
  JOB_TYPE_OPTIONS,
  NEAREST_CUSTOMER,
  RECENT_CUSTOMERS,
} from '@/data/startJobMock';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { MainStackParamList } from '@/types';

const TOTAL = 4;

const customerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(6, 'Enter a valid phone'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
});
type CustomerForm = z.infer<typeof customerSchema>;

type PickedCustomer = { name: string; phone?: string; address?: string };
type CustomerMode = 'list' | 'new' | 'dedup';

const StartJobScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<CustomerMode>('list');
  const [, setCustomer] = useState<PickedCustomer | null>(null);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState<string | null>(null);
  const [crew, setCrew] = useState<string[]>(['crew-ciaran']);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { fullName: '', phone: '', email: '', address: '' },
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

  const pickCustomer = (c: PickedCustomer) => {
    setCustomer(c);
    setMode('list');
    setStep(2);
  };

  const onSaveNew = form.handleSubmit(data => {
    const digits = data.phone.replace(/\D/g, '');
    const isMatch = /john/i.test(data.fullName) || digits.endsWith('4441209');
    if (isMatch) {
      setMode('dedup');
    } else {
      pickCustomer({ name: data.fullName, phone: data.phone, address: data.address });
    }
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
    });
    if (res.didCancel) return;
    if (res.errorCode) {
      Toast.show({ type: 'error', text1: res.errorMessage ?? 'Camera error.' });
      return;
    }
    setPhotoUri(res.assets?.[0]?.uri ?? null);
  };

  const finish = () => {
    Toast.show({ type: 'success', text1: 'Job started (demo).' });
    close();
  };

  const recent = RECENT_CUSTOMERS.filter(c =>
    search.trim()
      ? c.name.toLowerCase().includes(search.trim().toLowerCase())
      : true,
  );

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
        <View>
          <Text style={styles.sectionLabel}>NEAREST · GPS</Text>
          <CustomerCard
            name={NEAREST_CUSTOMER.name}
            address={NEAREST_CUSTOMER.address}
            meta={NEAREST_CUSTOMER.meta}
            highlighted
            onUse={() =>
              pickCustomer({
                name: NEAREST_CUSTOMER.name,
                phone: NEAREST_CUSTOMER.phone,
                address: NEAREST_CUSTOMER.address,
              })
            }
          />
          <Text style={styles.hintText}>
            No GPS? You can still search or add new — nothing&apos;s blocked.
          </Text>
        </View>
        <View>
          <Text style={styles.sectionLabel}>RECENT</Text>
          {recent.map(c => (
            <CustomerCard
              key={c.id}
              name={c.name}
              meta={c.meta}
              onPress={() =>
                pickCustomer({ name: c.name, phone: c.phone, address: c.address })
              }
            />
          ))}
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
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Address"
              placeholder="Address"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={form.formState.errors.address?.message}
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
  } else if (step === 1 && mode === 'dedup') {
    title = 'Hold on — is this John?';
    subtitle =
      'We match by phone to keep your customers tidy — same number means same person, even if a name was typed differently.';
    bodyContent = (
      <View style={styles.matchCard}>
        <Text style={styles.matchLabel}>PHONE NUMBER ALREADY ON FILE</Text>
        <CustomerCard
          name={DEDUP_MATCH.name}
          address={`${DEDUP_MATCH.address} · ${DEDUP_MATCH.phone}`}
          meta={DEDUP_MATCH.meta}
        />
      </View>
    );
    footer = (
      <View style={styles.gap12}>
        <Button
          label={`Yes — use existing ${DEDUP_MATCH.name}`}
          fullWidth
          onPress={() =>
            pickCustomer({
              name: DEDUP_MATCH.name,
              phone: DEDUP_MATCH.phone,
              address: DEDUP_MATCH.address,
            })
          }
        />
        <Button
          label="No — create a new customer"
          variant="outlined"
          color="secondary"
          fullWidth
          onPress={() => {
            const d = form.getValues();
            pickCustomer({ name: d.fullName, phone: d.phone, address: d.address });
          }}
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
            setCrew(['crew-ciaran']);
            setStep(4);
          }}
        />
        {CREW.map(m => (
          <CheckboxRow
            key={m.id}
            name={m.name}
            role={m.role}
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
  } else {
    title = 'Snap before photos.';
    subtitle =
      'Two or three photos of the existing state. They protect both sides if something’s queried.';
    bodyContent = (
      <Pressable style={styles.photoTile} onPress={openCamera}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImg} />
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
          onPress={openCamera}
        />
        <Pressable onPress={finish} hitSlop={8} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip — start the job</Text>
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
    skipBtn: { alignSelf: 'center', paddingVertical: 4 },
    skipText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
      textDecorationLine: 'underline',
    },
  });

export default StartJobScreen;
