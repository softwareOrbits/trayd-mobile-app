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

export const AskOptionSheet = ({
  field,
  value,
  onSelect,
  onClose,
}: {
  field: AskField | null;
  value: string;
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
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.optionBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={[styles.optionSheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <Text style={styles.optionTitle}>{field?.label}</Text>
            {searchable ? (
              <TextInput
                style={styles.optionSearch}
                value={query}
                onChangeText={setQuery}
                placeholder="Type or pick…"
                placeholderTextColor={colors.placeholder}
                autoCorrect={false}
              />
            ) : null}
            {options === null ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {searchable && typed && !exact ? (
                  <Pressable
                    style={styles.optionRow}
                    onPress={() => onSelect(typed)}
                  >
                    <Text style={styles.optionText}>{`Use “${typed}”`}</Text>
                    <Ionicons name="add" size={18} color={colors.secondary} />
                  </Pressable>
                ) : null}
                {visible.map(o => (
                  <Pressable
                    key={o}
                    style={styles.optionRow}
                    onPress={() => onSelect(o)}
                  >
                    <Text style={styles.optionText}>{o}</Text>
                    {o === value ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary}
                      />
                    ) : null}
                  </Pressable>
                ))}
                {!visible.length && !typed ? (
                  <Text style={styles.optionEmpty}>
                    {searchable
                      ? 'Nothing to pick from yet — type a name above.'
                      : 'No choices available.'}
                  </Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AskOptionSheet;
