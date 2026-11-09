import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, Input, Tabs } from '@/components/ui';
import {
  peekMaterials,
  searchMaterials,
  type CatalogMaterial,
} from '@/services/materials';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

export type SelectedMaterial = {
  /** Catalog `materials.id`, or null when the employee typed a custom item. */
  materialId: string | null;
  name: string;
  unit: string | null;
  sellPrice: number | null;
};

type PickMode = 'catalog' | 'custom';

const PICK_TABS = [
  { key: 'catalog', label: 'Van stock', icon: 'cube-outline' as const },
  { key: 'custom', label: 'Custom item', icon: 'create-outline' as const },
];

type Props = {
  value: SelectedMaterial | null;
  onChange: (m: SelectedMaterial) => void;
  label?: string;
  placeholder?: string;
};

const money = (n: number) => `€${n.toFixed(2)}`;

/**
 * Searchable material picker backed by the `materials` catalog. Typing filters
 * the catalog; if the typed text isn't an existing option, an "Add …" row lets
 * the employee log it as a custom (off-catalog) item. Reusable anywhere a
 * material needs picking (van stock, wrap-up, start job).
 */
export const MaterialSelect = ({
  value,
  onChange,
  label = 'Item',
  placeholder = 'Select a material',
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<PickMode>('catalog');
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (!open || mode !== 'catalog') return;
    // Non-empty cache hit → show instantly, no spinner, no debounce. An empty
    // entry is treated as a miss so the catalog still loads on open.
    const cached = peekMaterials(query);
    if (cached?.length) {
      setResults(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const t = setTimeout(() => {
      searchMaterials(query)
        .then(r => active && setResults(r))
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [open, query, mode]);

  const trimmed = query.trim();
  const exactMatch = results.some(
    r => r.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showAdd = trimmed.length > 0 && !exactMatch;

  const close = () => {
    setOpen(false);
    setQuery('');
    setCustomName('');
    setMode('catalog');
  };

  const pick = (m: CatalogMaterial) => {
    onChange({
      materialId: m.id,
      name: m.name,
      unit: m.unit,
      sellPrice: m.sellPrice,
    });
    close();
  };

  const addCustom = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    onChange({ materialId: null, name: clean, unit: null, sellPrice: null });
    close();
  };

  const switchMode = (next: string) => {
    const nextMode = next as PickMode;
    if (nextMode === 'custom' && !customName && trimmed && !exactMatch) {
      setCustomName(trimmed);
    }
    setMode(nextMode);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={() => setOpen(o => !o)}>
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {value?.name || placeholder}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={styles.dropdown}>
          <Tabs tabs={PICK_TABS} activeKey={mode} onChange={switchMode} />
          {mode === 'custom' ? (
            <View style={styles.customBox}>
              <Input
                label="Item name"
                placeholder="e.g. Pipe, fittings, sealant"
                value={customName}
                onChangeText={setCustomName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => addCustom(customName)}
              />
              <Text style={styles.customHint}>
                Not in the van? Add it here, then set the qty and price.
              </Text>
              <Button
                label="Use this item"
                fullWidth
                disabled={!customName.trim()}
                onPress={() => addCustom(customName)}
              />
            </View>
          ) : (
            <>
              <Input
                placeholder="Search van stock…"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoFocus
              />
              <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {showAdd ? (
                  <Pressable style={styles.addOption} onPress={() => addCustom(trimmed)}>
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.addText} numberOfLines={1}>
                      Add “{trimmed}” as a custom item
                    </Text>
                  </Pressable>
                ) : null}

                {loading ? (
                  <ActivityIndicator color={colors.secondary} style={styles.loading} />
                ) : results.length ? (
                  results.map(m => (
                    <Pressable
                      key={m.id}
                      style={styles.option}
                      onPress={() => pick(m)}
                    >
                      <Text style={styles.optionName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={styles.optionMeta}>
                        {money(m.sellPrice)}
                        {m.unit ? ` / ${m.unit}` : ''}
                      </Text>
                    </Pressable>
                  ))
                ) : !showAdd ? (
                  <Text style={styles.empty}>
                    Nothing in van stock yet. Use “Custom item” to add anything else.
                  </Text>
                ) : null}
              </ScrollView>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: 6 },
    label: {
      color: theme.colors.black,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: theme.colors.inputBackground,
      borderColor: theme.colors.inputBorder,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    value: {
      flex: 1,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.black,
    },
    placeholder: { color: theme.colors.placeholder },
    dropdown: {
      marginTop: 8,
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 10,
    },
    list: { maxHeight: 200 },
    customBox: { gap: 10, paddingTop: 4 },
    customHint: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
    },
    addOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    addText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    optionName: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.text,
    },
    optionMeta: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    loading: { paddingVertical: 16 },
    empty: {
      paddingVertical: 16,
      paddingHorizontal: 6,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
  });

export default MaterialSelect;
