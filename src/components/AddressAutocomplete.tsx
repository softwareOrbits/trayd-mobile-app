import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Input } from '@/components/ui';
import {
  autocompleteAddress,
  getPlaceDetails,
  newSessionToken,
  peekAddressSuggestions,
  type PlaceDetails,
  type PlaceSuggestion,
} from '@/services/places';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Fired when a suggestion is picked, with the resolved place (address/eircode/coords). */
  onSelect?: (place: PlaceDetails) => void;
  label?: string;
  placeholder?: string;
  error?: string;
};

/**
 * Address field backed by Google Places autocomplete. Typing surfaces Irish
 * address suggestions; picking one resolves the full address (and eircode +
 * coords via `onSelect`). Reusable anywhere an address is entered.
 */
export const AddressAutocomplete = ({
  value,
  onChangeText,
  onSelect,
  label,
  placeholder = 'Start typing — suggestions from Google Maps',
  error,
}: Props) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(newSessionToken);
  const resolving = useRef(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    // Cache hit → show instantly, no spinner, no debounce.
    const cached = peekAddressSuggestions(q);
    if (cached) {
      setSuggestions(cached);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const t = setTimeout(() => {
      autocompleteAddress(q, session)
        .then(s => active && setSuggestions(s))
        .catch(e => {
          if (active) setSuggestions([]);
          console.warn('places autocomplete:', e?.message);
        })
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, session]);

  const pick = async (s: PlaceSuggestion) => {
    setSuggestions([]);
    setQuery('');
    if (resolving.current) return;
    resolving.current = true;
    try {
      const d = await getPlaceDetails(s.placeId, session);
      onChangeText(d.address);
      onSelect?.(d);
      setSession(newSessionToken()); // a new session per completed lookup
    } catch (e) {
      console.warn('place details:', e instanceof Error ? e.message : e);
    } finally {
      resolving.current = false;
    }
  };

  return (
    <View style={styles.container}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        error={error}
        autoCapitalize="words"
        onChangeText={t => {
          onChangeText(t);
          setQuery(t);
        }}
      />
      {loading || suggestions.length ? (
        <View style={styles.suggestBox}>
          {loading && !suggestions.length ? (
            <ActivityIndicator color={colors.secondary} style={styles.loading} />
          ) : (
            suggestions.map((s, i) => (
              <Pressable
                key={s.placeId}
                style={[
                  styles.suggestRow,
                  i < suggestions.length - 1 ? styles.suggestDivider : null,
                ]}
                onPress={() => pick(s)}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.suggestText} numberOfLines={2}>
                  {s.description}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { gap: 8 },
    suggestBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      overflow: 'hidden',
    },
    suggestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
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
    loading: { paddingVertical: 16 },
  });

export default AddressAutocomplete;
