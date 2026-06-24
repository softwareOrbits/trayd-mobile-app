import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import {
  MaterialSelect,
  type SelectedMaterial,
} from '@/components/MaterialSelect';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeJobDetailStyles } from '@/styles/jobDetail.styles';

type TimePreset = 'down5' | 'down15' | 'now';

export const MaterialSheet = ({
  mode,
  itemName,
  itemUnit,
  itemQty,
  itemCost,
  saving,
  onPick,
  onChangeQty,
  onChangeCost,
  onSave,
  onRemove,
  onClose,
}: {
  mode: 'new' | string | null;
  itemName: string;
  itemUnit: string | null;
  itemQty: string;
  itemCost: string;
  saving: boolean;
  onPick: (m: SelectedMaterial) => void;
  onChangeQty: (v: string) => void;
  onChangeCost: (v: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeJobDetailStyles);
  return (
    <Modal
      visible={mode !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>
            {mode === 'new' ? 'Log van stock' : 'Edit item'}
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
            onChange={onPick}
          />
          <View style={styles.modalRow}>
            <Input
              label="Qty"
              keyboardType="numeric"
              value={itemQty}
              onChangeText={onChangeQty}
              containerStyle={styles.modalRowItem}
            />
            <Input
              label="Unit price (€)"
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={itemCost}
              onChangeText={onChangeCost}
              containerStyle={styles.modalRowItem}
            />
          </View>
          <Button
            label={mode === 'new' ? 'Log item' : 'Save changes'}
            fullWidth
            loading={saving}
            disabled={!itemName.trim()}
            onPress={onSave}
          />
          {mode !== 'new' ? (
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={styles.modalDeleteBtn}
            >
              <Text style={styles.modalDeleteText}>Remove item</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const TimeEditSheet = ({
  visible,
  hh,
  mm,
  reason,
  saving,
  onChangeHH,
  onChangeMM,
  onChangeReason,
  onPreset,
  onSave,
  onClose,
}: {
  visible: boolean;
  hh: string;
  mm: string;
  reason: string;
  saving: boolean;
  onChangeHH: (v: string) => void;
  onChangeMM: (v: string) => void;
  onChangeReason: (v: string) => void;
  onPreset: (kind: TimePreset) => void;
  onSave: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeJobDetailStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>Edit start time</Text>
          <Text style={styles.modalHint}>
            Adjust when the job started — we log the edit for your office.
          </Text>
          <View style={styles.timeRow}>
            <Input
              keyboardType="number-pad"
              maxLength={2}
              value={hh}
              onChangeText={onChangeHH}
              style={styles.timeBox}
              containerStyle={styles.timeBoxWrap}
            />
            <Text style={styles.timeColon}>:</Text>
            <Input
              keyboardType="number-pad"
              maxLength={2}
              value={mm}
              onChangeText={onChangeMM}
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
                onPress={() => onPreset(p.k)}
              >
                <Text style={styles.presetChipText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <Input
            label="Reason for edit (optional)"
            placeholder="e.g. Forgot to start the timer on arrival."
            value={reason}
            onChangeText={onChangeReason}
          />
          <Button
            label={`Save · ${hh}:${mm}`}
            fullWidth
            loading={saving}
            onPress={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const ConfirmActionModal = ({
  mode,
  actioning,
  onConfirm,
  onClose,
}: {
  mode: 'cancel' | 'delete' | null;
  actioning: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeJobDetailStyles);
  return (
    <Modal
      visible={mode !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>
            {mode === 'delete' ? 'Delete this job?' : 'Cancel this job?'}
          </Text>
          <Text style={styles.modalHint}>
            {mode === 'delete'
              ? 'This permanently removes the job and can’t be undone.'
              : 'This marks the job as cancelled. It stays visible under Done.'}
          </Text>
          <Pressable
            style={styles.dangerBtn}
            disabled={actioning}
            onPress={onConfirm}
          >
            {actioning ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.dangerText}>
                {mode === 'delete' ? 'Yes, delete job' : 'Yes, cancel job'}
              </Text>
            )}
          </Pressable>
          <Pressable style={styles.keepBtn} onPress={onClose}>
            <Text style={styles.keepText}>Keep job</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
