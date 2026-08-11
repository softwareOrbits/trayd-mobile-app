import { Fragment, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button } from '@/components/ui';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError } from '@/utils/toast';
import { makeServiceScheduleStyles } from '@/styles/serviceSchedule.styles';
import type { MaintenanceItem } from '@/types';

type Editor =
  | { mode: 'add' }
  | { mode: 'edit'; item: MaintenanceItem }
  | null;

const costLabel = (cost: number | null) =>
  cost == null ? null : `€${cost.toLocaleString('en-IE')}`;

/**
 * The MAINTENANCE ITEM dropdown. Everyone reads the catalog; owners can also
 * add, rename, reprice and delete — every row is this business's own copy.
 */
export const MaintenanceItemPicker = ({
  visible,
  items,
  selectedName,
  canManage,
  onSelect,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: {
  visible: boolean;
  items: MaintenanceItem[] | null;
  selectedName: string | null;
  canManage: boolean;
  onSelect: (item: MaintenanceItem) => void;
  onClose: () => void;
  onAdd: (name: string, defaultCost: number | null) => Promise<void>;
  onUpdate: (
    item: MaintenanceItem,
    name: string,
    defaultCost: number | null,
  ) => Promise<void>;
  onDelete: (item: MaintenanceItem) => Promise<void>;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeServiceScheduleStyles);

  const [managing, setManaging] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setManaging(false);
      setEditor(null);
      setName('');
      setCost('');
    }
  }, [visible]);

  const openEditor = (next: Editor) => {
    setEditor(next);
    setName(next?.mode === 'edit' ? next.item.name : '');
    setCost(
      next?.mode === 'edit' && next.item.defaultCost != null
        ? String(next.item.defaultCost)
        : '',
    );
  };

  const closeEditor = () => {
    Keyboard.dismiss();
    setEditor(null);
    setName('');
    setCost('');
  };

  const dismiss = () => {
    Keyboard.dismiss();
    onClose();
  };

  const save = async () => {
    if (!editor || !name.trim()) return;
    const parsed = cost.trim() ? Number(cost.replace(',', '.')) : null;
    if (parsed != null && !Number.isFinite(parsed)) {
      toastError(null, 'That cost is not a number.');
      return;
    }
    setSaving(true);
    try {
      if (editor.mode === 'add') await onAdd(name, parsed);
      else await onUpdate(editor.item, name, parsed);
      closeEditor();
    } catch (e) {
      toastError(e, 'Could not save that item.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: MaintenanceItem) =>
    Alert.alert(
      `Remove ${item.name}?`,
      'It disappears from this list. Schedules already using it keep the name.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onDelete(item).catch(e =>
              toastError(e, 'Could not remove that item.'),
            );
          },
        },
      ],
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        style={sheetLayout.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetTopRow}>
              <Text style={styles.sheetTitle}>Maintenance item</Text>
              {canManage ? (
                <Pressable
                  onPress={() => {
                    setManaging(m => !m);
                    closeEditor();
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.sheetAction}>
                    {managing ? 'DONE' : 'MANAGE'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {items === null ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {items.length === 0 ? (
                  <Text style={styles.sheetEmpty}>
                    No items in your list yet.
                  </Text>
                ) : null}
                {items.map((item, i) => {
                  const on = item.name === selectedName;
                  return (
                    <Fragment key={item.id}>
                      {i > 0 ? <View style={styles.sheetDivider} /> : null}
                      <Pressable
                        style={styles.sheetRow}
                        onPress={() =>
                          managing ? openEditor({ mode: 'edit', item }) : onSelect(item)
                        }
                      >
                        <View style={styles.sheetRowBody}>
                          <Text
                            style={[
                              styles.sheetRowText,
                              on && !managing && styles.sheetRowActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.defaultCost != null ? (
                            <Text style={styles.sheetRowMeta}>
                              {`Usually ${costLabel(item.defaultCost)}`}
                            </Text>
                          ) : null}
                        </View>
                        {managing ? (
                          <>
                            <View style={styles.sheetIconBtn}>
                              <Ionicons
                                name="create-outline"
                                size={17}
                                color={colors.secondary}
                              />
                            </View>
                            <Pressable
                              style={styles.sheetIconBtn}
                              onPress={() => confirmDelete(item)}
                              hitSlop={6}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={17}
                                color={colors.error}
                              />
                            </Pressable>
                          </>
                        ) : on ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    </Fragment>
                  );
                })}

                {canManage && !editor ? (
                  <Pressable
                    style={styles.sheetRow}
                    onPress={() => openEditor({ mode: 'add' })}
                  >
                    <Ionicons name="add" size={18} color={colors.secondary} />
                    <Text style={styles.sheetRowText}>
                      Not listed? Add an item
                    </Text>
                  </Pressable>
                ) : null}

                {editor ? (
                  <View style={styles.editorCard}>
                    <Text style={styles.editorTitle}>
                      {editor.mode === 'add' ? 'NEW ITEM' : 'EDIT ITEM'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Timing chain"
                      placeholderTextColor={colors.placeholder}
                      value={name}
                      onChangeText={setName}
                      autoFocus
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Usual cost (optional)"
                      placeholderTextColor={colors.placeholder}
                      value={cost}
                      onChangeText={setCost}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                    <View style={styles.editorBtns}>
                      <View style={styles.editorBtn}>
                        <Button
                          label="Cancel"
                          variant="outlined"
                          color="secondary"
                          fullWidth
                          disabled={saving}
                          onPress={closeEditor}
                        />
                      </View>
                      <View style={styles.editorBtn}>
                        <Button
                          label="Save"
                          fullWidth
                          loading={saving}
                          disabled={!name.trim() || saving}
                          onPress={save}
                        />
                      </View>
                    </View>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const sheetLayout = StyleSheet.create({ fill: { flex: 1 } });

export default MaintenanceItemPicker;
