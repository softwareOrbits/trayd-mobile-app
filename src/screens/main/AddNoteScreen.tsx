import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppToast, Button, Input } from '@/components/ui';
import { TagChip } from '@/components/jobDetail';
import { addJobNote, type NoteVisibility } from '@/services/jobs';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError, toastSuccess } from '@/utils/toast';
import type { MainStackParamList } from '@/types';

const QUICK_ADD = [
  'Follow-up needed',
  'Customer not on site',
  'Materials short',
  'Quoted separately',
];

const VISIBILITY_OPTIONS: {
  key: NoteVisibility;
  title: string;
  chip: string;
  desc: string;
}[] = [
  {
    key: 'employer_only',
    title: 'Employer-only',
    chip: 'OFF INVOICE',
    desc: 'Hidden from the customer copy of the invoice.',
  },
  {
    key: 'customer_visible',
    title: 'Customer-visible',
    chip: 'ON INVOICE',
    desc: "Visible on the customer's copy.",
  },
];

const AddNoteScreen = () => {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'AddNote'>>();

  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<NoteVisibility>('employer_only');
  const [saving, setSaving] = useState(false);

  const quickAdd = (phrase: string) =>
    setText(prev =>
      prev.trim() ? `${prev.trimEnd()}\n${phrase}.` : `${phrase}.`,
    );

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await addJobNote(params.jobId, text.trim(), visibility);
      toastSuccess('Note added.');
      navigation.goBack();
    } catch (e) {
      toastError(e, 'Could not save the note.');
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add a note</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Anything your employer should know, or the customer should see on
          the invoice.
        </Text>

        <Input
          placeholder="e.g. Secondary leak found behind boiler — may need follow-up."
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          style={styles.noteInput}
        />

        <Text style={styles.sectionLabel}>VISIBILITY</Text>
        <View style={styles.optionGroup}>
          {VISIBILITY_OPTIONS.map((o, i) => {
            const selected = visibility === o.key;
            return (
              <Pressable
                key={o.key}
                style={[
                  styles.optionRow,
                  i < VISIBILITY_OPTIONS.length - 1
                    ? styles.optionDivider
                    : null,
                ]}
                onPress={() => setVisibility(o.key)}
              >
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.optionBody}>
                  <View style={styles.optionHead}>
                    <Text style={styles.optionTitle}>{o.title}</Text>
                    <TagChip label={o.chip} />
                  </View>
                  <Text style={styles.optionDesc}>{o.desc}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>QUICK ADD</Text>
        <View style={styles.chipWrap}>
          {QUICK_ADD.map(p => (
            <Pressable key={p} style={styles.chip} onPress={() => quickAdd(p)}>
              <Text style={styles.chipText}>+ {p}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Save note"
          fullWidth
          loading={saving}
          disabled={!text.trim()}
          onPress={save}
        />
      </View>
      <AppToast />
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 60,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    headerSpacer: { width: 60 },

    content: { paddingHorizontal: 20, paddingBottom: 24 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
      marginBottom: 14,
    },
    noteInput: { minHeight: 140, textAlignVertical: 'top' },

    sectionLabel: {
      marginTop: 22,
      marginBottom: 10,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    optionGroup: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 14,
    },
    optionDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    radioOn: { borderColor: theme.colors.primary },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    optionBody: { flex: 1, gap: 3 },
    optionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    optionTitle: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    optionDesc: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      lineHeight: 17,
    },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
      color: theme.colors.primary,
    },

    footer: { paddingHorizontal: 20, paddingTop: 12 },
  });

export default AddNoteScreen;
