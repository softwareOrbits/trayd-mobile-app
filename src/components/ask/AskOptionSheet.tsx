import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import { fetchAskFieldOptions } from '@/services/askTrayd';
import type { AskField } from '@/types';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const AskOptionSheet = ({
  field,
  value,
  selected,
  onSelect,
  onClose,
}: {
  field: AskField | null;
  value: string;
  selected?: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState<string[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setQuery('');
    if (!field) return undefined;
    if (field.options?.length) {
      setOptions(field.options);
      return undefined;
    }
    if (!field.source) {
      setOptions([]);
      return undefined;
    }
    let active = true;
    setOptions(null);
    fetchAskFieldOptions(field.source)
      .then(list => active && setOptions(list))
      .catch(() => active && setOptions([]));
    return () => {
      active = false;
    };
  }, [field]);

  const searchable = !!field?.source;
  const typed = query.trim();
  const visible = useMemo(() => {
    const list = options ?? [];
    if (!typed) return list;
    const q = typed.toLowerCase();
    return list.filter(o => o.toLowerCase().includes(q));
  }, [options, typed]);
  const exact = visible.some(o => o.toLowerCase() === typed.toLowerCase());

  return (
    <Modal
      visible={!!field}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.optionKav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.optionBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[styles.optionSheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.optionHandle} />
            <View style={styles.optionHeadRow}>
              <Text style={styles.optionTitle}>{field?.label}</Text>
              {selected?.length ? (
                <Text style={styles.optionCount}>{`${selected.length} selected`}</Text>
              ) : null}
            </View>
            {searchable ? (
              <View style={styles.optionSearchWrap}>
                <Ionicons name="search" size={18} color="#A8AEB8" />
                <TextInput
                  style={styles.optionSearchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search or type a name…"
                  placeholderTextColor={colors.placeholder}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!typed) return;
                    onSelect(
                      visible.find(o => o.toLowerCase() === typed.toLowerCase()) ??
                        typed,
                    );
                    setQuery('');
                  }}
                />
              </View>
            ) : null}
            {selected?.length ? (
              <View style={styles.optionChips}>
                {selected.map(name => (
                  <Pressable
                    key={name}
                    style={styles.optionChip}
                    onPress={() => onSelect(name)}
                  >
                    <Text style={styles.optionChipText} numberOfLines={1}>
                      {name}
                    </Text>
                    <Ionicons name="close" size={13} color={colors.white} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {options === null ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {searchable && typed && !exact ? (
                  <Pressable
                    style={styles.optionRow}
                    onPress={() => {
                      onSelect(typed);
                      setQuery('');
                    }}
                  >
                    <View style={styles.optionAvatar}>
                      <Ionicons name="add" size={18} color={colors.secondary} />
                    </View>
                    <View style={styles.optionTextCol}>
                      <Text style={styles.optionText}>{`Use “${typed}”`}</Text>
                      <Text style={styles.optionSub}>Not in your list</Text>
                    </View>
                  </Pressable>
                ) : null}
                {visible.map(o => {
                  const on = selected ? selected.includes(o) : o === value;
                  return (
                    <Pressable
                      key={o}
                      style={[styles.optionRow, on && styles.optionRowOn]}
                      onPress={() => {
                        onSelect(o);
                        setQuery('');
                      }}
                    >
                      <View style={[styles.optionAvatar, on && styles.optionAvatarOn]}>
                        <Text style={styles.optionAvatarText}>{initialsOf(o)}</Text>
                      </View>
                      <View style={styles.optionTextCol}>
                        <Text style={styles.optionText} numberOfLines={1}>
                          {o}
                        </Text>
                      </View>
                      {on ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
                {!visible.length && !typed ? (
                  <Text style={styles.optionEmpty}>
                    {searchable
                      ? 'Nothing to pick from yet — type a name above.'
                      : 'No choices available.'}
                  </Text>
                ) : null}
              </ScrollView>
            )}
            {selected ? (
              <Pressable style={styles.optionDone} onPress={onClose}>
                <Text style={styles.optionDoneText}>
                  {selected.length ? `Done · ${selected.length} selected` : 'Done'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AskOptionSheet;
