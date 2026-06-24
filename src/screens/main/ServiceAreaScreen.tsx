import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { AppToast, Button, Input, JobFooter, JobHeader } from '@/components/ui';
import {
  fetchMyMember,
  parseServiceArea,
  updateMyServiceArea,
  type ServiceArea,
} from '@/services/member';
import {
  autocompleteAddress,
  newSessionToken,
  staticMapUrl,
  type PlaceSuggestion,
} from '@/services/places';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeServiceAreaStyles } from '@/styles/serviceArea.styles';
import { toastError } from '@/utils/toast';
import { isNetworkError } from '@/utils/errors';
import type { MainStackParamList } from '@/types';

const sameArea = (a: ServiceArea, b: ServiceArea) =>
  a.primary === b.primary &&
  a.additional.length === b.additional.length &&
  a.additional.every((v, i) => v === b.additional[i]);

const ServiceAreaScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeServiceAreaStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [area, setArea] = useState<ServiceArea | null>(null);
  const [original, setOriginal] = useState<ServiceArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionToken = useRef(newSessionToken());

  useEffect(() => {
    let active = true;
    fetchMyMember()
      .then(m => {
        if (!active) return;
        const parsed = parseServiceArea(m.serviceArea);
        setArea(parsed);
        setOriginal(parsed);
      })
      .catch(
        e =>
          active &&
          !isNetworkError(e) &&
          Toast.show({ type: 'error', text1: 'Could not load your areas.' }),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Debounced Google Places lookup.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      autocompleteAddress(q, sessionToken.current)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const known = useMemo(() => {
    if (!area) return new Set<string>();
    return new Set(
      [area.primary, ...area.additional]
        .filter((v): v is string => !!v)
        .map(v => v.toLowerCase()),
    );
  }, [area]);

  const addLocation = useCallback(
    (value: string) => {
      setArea(prev => {
        if (!prev) return prev;
        if (known.has(value.toLowerCase())) return prev;
        if (!prev.primary) return { ...prev, primary: value };
        return { ...prev, additional: [...prev.additional, value] };
      });
      setQuery('');
      setSuggestions([]);
      sessionToken.current = newSessionToken();
    },
    [known],
  );

  const removeAdditional = useCallback((value: string) => {
    setArea(prev =>
      prev
        ? { ...prev, additional: prev.additional.filter(v => v !== value) }
        : prev,
    );
  }, []);

  const clearPrimary = useCallback(() => {
    setArea(prev => {
      if (!prev) return prev;
      const [next, ...rest] = prev.additional;
      return { primary: next ?? null, additional: rest };
    });
  }, []);

  const makePrimary = useCallback((value: string) => {
    setArea(prev => {
      if (!prev) return prev;
      const rest = prev.additional.filter(v => v !== value);
      if (prev.primary) rest.unshift(prev.primary);
      return { primary: value, additional: rest };
    });
  }, []);

  const mapUrl = useMemo(
    () =>
      area
        ? staticMapUrl(
            [area.primary, ...area.additional].filter(
              (v): v is string => !!v,
            ),
          )
        : null,
    [area],
  );

  const dirty = area && original ? !sameArea(area, original) : false;

  const save = async () => {
    if (!area || !dirty || saving) return;
    setSaving(true);
    try {
      await updateMyServiceArea(area);
      Toast.show({ type: 'success', text1: 'Service area saved.' });
      navigation.goBack();
    } catch (e) {
      toastError(e, 'Could not save your areas.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <JobHeader title="Service area" onBack={() => navigation.goBack()} />

      {loading || !area ? (
        <View style={[styles.flex, styles.centered]}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Where do you usually work? The office uses this to match you to
            nearby jobs.
          </Text>

          {mapUrl ? (
            <Image
              source={{ uri: mapUrl }}
              style={styles.map}
              resizeMode="cover"
            />
          ) : null}

          {/* Primary */}
          <Text style={styles.section}>PRIMARY AREA</Text>
          {area.primary ? (
            <View style={styles.primaryCard}>
              <View style={styles.primaryIcon}>
                <Ionicons name="location" size={18} color={colors.primary} />
              </View>
              <Text style={styles.primaryText} numberOfLines={2}>
                {area.primary}
              </Text>
              <Pressable onPress={clearPrimary} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.placeholder} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Add a location below to set your main area.
              </Text>
            </View>
          )}

          {/* Additional */}
          {area.additional.length > 0 ? (
            <>
              <Text style={styles.section}>ADDITIONAL AREAS</Text>
              <View style={styles.card}>
                {area.additional.map((loc, i) => (
                  <View key={loc}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.addRow}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.addText} numberOfLines={1}>
                        {loc}
                      </Text>
                      <Pressable
                        onPress={() => makePrimary(loc)}
                        hitSlop={8}
                        style={styles.starBtn}
                      >
                        <Ionicons
                          name="star-outline"
                          size={16}
                          color={colors.secondary}
                        />
                      </Pressable>
                      <Pressable onPress={() => removeAdditional(loc)} hitSlop={8}>
                        <Ionicons
                          name="close"
                          size={18}
                          color={colors.placeholder}
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Add */}
          <Text style={styles.section}>ADD AREA</Text>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search a town, city or area"
            autoCapitalize="words"
            rightIcon="search"
          />
          {searching ? (
            <View style={styles.searchHint}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.searchHintText}>Searching…</Text>
            </View>
          ) : null}
          {suggestions.length > 0 ? (
            <View style={styles.suggestCard}>
              {suggestions.map((s, i) => (
                <View key={s.placeId}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    style={styles.suggestRow}
                    onPress={() => addLocation(s.description)}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.suggestText} numberOfLines={2}>
                      {s.description}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <JobFooter>
        <Button
          label="Save changes"
          fullWidth
          loading={saving}
          disabled={!dirty}
          onPress={save}
        />
      </JobFooter>

      <AppToast />
    </View>
  );
};

export default ServiceAreaScreen;
