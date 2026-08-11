import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, CalendarModal } from '@/components/ui';
import { MaintenanceItemPicker } from '@/components/fleet/MaintenanceItemPicker';
import {
  addMaintenanceItem,
  addServiceScheduleItem,
  deleteMaintenanceItem,
  fetchMaintenanceItems,
  updateMaintenanceItem,
} from '@/services/fleet';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { fmtDateWeekday } from '@/utils/datetime';
import { goBackSafe } from '@/utils/navigation';
import { toastError, toastSuccess } from '@/utils/toast';
import {
  RECURS_BY_OPTIONS,
  SERVICE_TYPES,
  computeNextDueOn,
  needsKm,
  needsMonths,
  serviceTypeLabel,
  validateScheduleInput,
} from '@/utils/serviceSchedule';
import { makeServiceScheduleStyles } from '@/styles/serviceSchedule.styles';
import type {
  MainStackParamList,
  MaintenanceItem,
  NewServiceScheduleInput,
  RecursBy,
  ServiceType,
} from '@/types';

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');
const asNumber = (value: string) => (value ? Number(value) : null);

const AddServiceScheduleScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeServiceScheduleStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } =
    useRoute<RouteProp<MainStackParamList, 'AddServiceSchedule'>>();
  const isOwner = useAppSelector(s => s.auth.isOwner);

  const [items, setItems] = useState<MaintenanceItem[] | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('minor_service');
  const [recursBy, setRecursBy] = useState<RecursBy>('time');
  const [months, setMonths] = useState('12');
  const [km, setKm] = useState('');
  const [lastDone, setLastDone] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [typeSheet, setTypeSheet] = useState(false);
  const [itemSheet, setItemSheet] = useState(false);
  const [datePicker, setDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMaintenanceItems()
      .then(rows => active && setItems(rows))
      .catch(e => {
        if (active) setItems([]);
        toastError(e, 'Could not load your maintenance items.');
      });
    return () => {
      active = false;
    };
  }, []);

  const input: NewServiceScheduleInput = useMemo(
    () => ({
      vehicleId: params.vehicleId,
      serviceType,
      itemName: itemName ?? '',
      recursBy,
      intervalMonths: asNumber(months),
      intervalKm: asNumber(km),
      lastDoneOn: lastDone,
      notes: notes || null,
    }),
    [params.vehicleId, serviceType, itemName, recursBy, months, km, lastDone, notes],
  );

  const problem = validateScheduleInput(input);
  const nextDueOn = computeNextDueOn(lastDone, recursBy, asNumber(months));

  const save = async () => {
    if (problem || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await addServiceScheduleItem(input);
      goBackSafe(navigation);
      toastSuccess('Added to the service schedule');
    } catch (e) {
      toastError(e, 'Could not add that schedule item.');
      setSaving(false);
    }
  };

  const header = (
    <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        style={styles.backBtn}
        onPress={() => goBackSafe(navigation)}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.secondary} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerEyebrow}>
          {params.registration ? `VAN · ${params.registration}` : 'SERVICE SCHEDULE'}
        </Text>
        <Text style={styles.headerTitle}>Add schedule item</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <View style={styles.flex}>
      {header}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.label}>VEHICLE</Text>
        <View style={styles.pill}>
          <Ionicons name="bus-outline" size={17} color={colors.secondary} />
          <Text style={styles.pillValue}>
            {params.registration ?? 'This van'}
          </Text>
          <Text style={styles.pillMeta}>locked</Text>
        </View>

        <Text style={styles.label}>SERVICE TYPE</Text>
        <Pressable style={styles.pill} onPress={() => setTypeSheet(true)}>
          <Text style={styles.pillValue}>{serviceTypeLabel(serviceType)}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.label}>MAINTENANCE ITEM · REQUIRED</Text>
        <Pressable
          style={styles.pill}
          onPress={() => {
            Keyboard.dismiss();
            setItemSheet(true);
          }}
        >
          <Text style={itemName ? styles.pillValue : styles.pillPlaceholder}>
            {itemName ?? 'Pick an item'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <Text style={styles.label}>RECURS BY</Text>
        <View style={styles.segmentRow}>
          {RECURS_BY_OPTIONS.map(opt => {
            const on = opt.key === recursBy;
            return (
              <Pressable
                key={opt.key}
                style={[styles.segment, on && styles.segmentOn]}
                onPress={() => setRecursBy(opt.key)}
              >
                <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.intervalRow}>
          {needsMonths(recursBy) ? (
            <View style={styles.intervalCell}>
              <Text style={styles.label}>EVERY (MONTHS)</Text>
              <TextInput
                style={styles.input}
                placeholder="12"
                placeholderTextColor={colors.placeholder}
                value={months}
                onChangeText={v => setMonths(digitsOnly(v))}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          ) : null}
          {needsKm(recursBy) ? (
            <View style={styles.intervalCell}>
              <Text style={styles.label}>EVERY (KM)</Text>
              <TextInput
                style={styles.input}
                placeholder="15000"
                placeholderTextColor={colors.placeholder}
                value={km}
                onChangeText={v => setKm(digitsOnly(v))}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          ) : null}
        </View>

        <Text style={styles.label}>LAST DONE · OPTIONAL</Text>
        <Pressable
          style={styles.pill}
          onPress={() => {
            Keyboard.dismiss();
            setDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={17} color={colors.secondary} />
          <Text style={lastDone ? styles.pillValue : styles.pillPlaceholder}>
            {lastDone ? fmtDateWeekday(lastDone) : 'Not recorded'}
          </Text>
          {lastDone ? (
            <Pressable onPress={() => setLastDone(null)} hitSlop={10}>
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </Pressable>

        <Text style={styles.label}>NEXT DUE</Text>
        <View style={styles.nextDueCard}>
          <Ionicons name="flag-outline" size={17} color={colors.secondary} />
          <View style={styles.nextDueBody}>
            <Text style={styles.nextDueValue}>
              {nextDueOn ? fmtDateWeekday(nextDueOn) : 'Tracked by odometer'}
            </Text>
            <Text style={styles.nextDueHint}>
              {recursBy === 'mileage'
                ? 'Mileage-only items have no date — they fall due on the van’s odometer reading.'
                : lastDone
                  ? 'Worked out from LAST DONE plus the interval.'
                  : 'Add a LAST DONE date and we’ll project the next one.'}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>NOTES · WHAT’S NEEDED</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. Long-life oil only, book with Murphy’s"
          placeholderTextColor={colors.placeholder}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Add to schedule"
          leftIcon="calendar"
          fullWidth
          loading={saving}
          disabled={!!problem || saving}
          onPress={save}
        />
        {problem ? <Text style={styles.hint}>{problem}</Text> : null}
      </View>

      <MaintenanceItemPicker
        visible={itemSheet}
        items={items}
        selectedName={itemName}
        canManage={isOwner}
        onSelect={item => {
          setItemName(item.name);
          setItemSheet(false);
        }}
        onClose={() => setItemSheet(false)}
        onAdd={async (name, cost) => {
          const created = await addMaintenanceItem(name, cost);
          setItems(prev => [...(prev ?? []), created]);
          setItemName(created.name);
        }}
        onUpdate={async (item, name, cost) => {
          const updated = await updateMaintenanceItem(item.id, name, cost);
          setItems(prev =>
            (prev ?? []).map(i => (i.id === updated.id ? updated : i)),
          );
          if (itemName === item.name) setItemName(updated.name);
        }}
        onDelete={async item => {
          await deleteMaintenanceItem(item.id);
          setItems(prev => (prev ?? []).filter(i => i.id !== item.id));
          if (itemName === item.name) setItemName(null);
        }}
      />

      <CalendarModal
        visible={datePicker}
        value={lastDone}
        title="Last done"
        onSelect={d => {
          setLastDone(d);
          setDatePicker(false);
        }}
        onClose={() => setDatePicker(false)}
      />

      <Modal
        visible={typeSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeSheet(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTypeSheet(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Service type</Text>
            {SERVICE_TYPES.map(t => (
              <Pressable
                key={t.key}
                style={styles.sheetRow}
                onPress={() => {
                  setServiceType(t.key);
                  setTypeSheet(false);
                }}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    t.key === serviceType && styles.sheetRowActive,
                  ]}
                >
                  {t.label}
                </Text>
                {t.key === serviceType ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddServiceScheduleScreen;
