import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedView, signOut } from '@/store/authSlice';
import { fetchOnboardingComplete } from '@/services/onboarding';
import { Button } from '@/components/ui';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { SelectedView } from '@/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const EMPLOYER_TAGS = ['Invoices', 'Jobs', 'Team', 'Accounting'];
const FIELD_TAGS = ['Chat', 'Start a job', 'Van check'];

const ViewChooserScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);

  const [checking, setChecking] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [selected, setSelected] = useState<SelectedView>('field');

  const firstName = useMemo(() => {
    const source = user?.name || user?.email?.split('@')[0] || '';
    return source.split(/[\s.]+/)[0];
  }, [user]);

  useEffect(() => {
    let active = true;
    fetchOnboardingComplete()
      .then(complete => {
        if (!active) return;
        setOnboarded(complete);
        // Default the selection to the employer dashboard once it's available.
        if (complete) setSelected('employer');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const employerAvailable = onboarded;

  const onContinue = () => dispatch(setSelectedView(selected));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.brandRow}>
        <Image
          source={require('@assets/images/small_logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}>
        How do you want to work today{firstName ? `, ${firstName}` : ''}?
      </Text>
      <Text style={styles.subtitle}>
        Pick a view — you can switch anytime from the menu.
      </Text>

      <View style={styles.cards}>
        {/* Employer view */}
        <ViewCard
          styles={styles}
          colors={colors}
          tone="employer"
          icon="briefcase-outline"
          title="Employer view"
          description="Run the business — review invoices, watch live jobs, manage the team."
          tags={EMPLOYER_TAGS}
          selected={selected === 'employer'}
          disabled={!employerAvailable}
          onPress={() => setSelected('employer')}
          footer={
            checking ? (
              <View style={styles.noticeRow}>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.noticeTextOnDark}>Checking your setup…</Text>
              </View>
            ) : !employerAvailable ? (
              <View style={styles.noticeRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.white}
                />
                <Text style={styles.noticeTextOnDark}>
                  Finish setting up your business on the Trayd web app to open the
                  dashboard here.
                </Text>
              </View>
            ) : null
          }
        />

        {/* Employee / field view */}
        <ViewCard
          styles={styles}
          colors={colors}
          tone="field"
          icon="construct-outline"
          title="Employee view"
          description="Work a job — the chat logs your time, materials and photos as you go."
          tags={FIELD_TAGS}
          selected={selected === 'field'}
          disabled={false}
          onPress={() => setSelected('field')}
        />
      </View>

      <View style={styles.footer}>
        <Button
          label={
            selected === 'employer' ? 'Continue as employer' : 'Continue as employee'
          }
          color="secondary"
          fullWidth
          disabled={checking || (selected === 'employer' && !employerAvailable)}
          onPress={onContinue}
        />
        <Pressable
          onPress={() => dispatch(signOut())}
          style={styles.logoutBtn}
          hitSlop={8}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

type ViewCardProps = {
  styles: ReturnType<typeof makeStyles>;
  colors: Theme['colors'];
  tone: 'employer' | 'field';
  icon: IoniconName;
  title: string;
  description: string;
  tags: string[];
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  footer?: ReactNode;
};

const ViewCard = ({
  styles,
  colors,
  tone,
  icon,
  title,
  description,
  tags,
  selected,
  disabled,
  onPress,
  footer,
}: ViewCardProps) => {
  const onDark = tone === 'employer';
  const textColor = onDark ? colors.white : colors.text;
  const mutedColor = onDark ? 'rgba(255,255,255,0.72)' : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      onPress={disabled ? undefined : onPress}
      style={[
        styles.card,
        onDark ? styles.cardEmployer : styles.cardField,
        selected && (onDark ? styles.cardEmployerSelected : styles.cardFieldSelected),
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: onDark ? 'rgba(255,255,255,0.12)' : colors.surfaceMuted },
          ]}
        >
          <Ionicons name={icon} size={20} color={textColor} />
        </View>
        <View
          style={[
            styles.radio,
            { borderColor: selected ? colors.primary : mutedColor },
            selected && { backgroundColor: colors.primary },
          ]}
        >
          {selected ? (
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          ) : null}
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.cardDesc, { color: mutedColor }]}>{description}</Text>

      <View style={styles.tags}>
        {tags.map(tag => (
          <View
            key={tag}
            style={[
              styles.tag,
              { backgroundColor: onDark ? 'rgba(255,255,255,0.12)' : colors.surfaceMuted },
            ]}
          >
            <Text style={[styles.tagText, { color: mutedColor }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {footer}
    </Pressable>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    content: { flexGrow: 1, paddingHorizontal: 24 },
    brandRow: { alignItems: 'flex-start', marginBottom: 20 },
    logo: { width: 64, height: 47 },
    title: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.textMuted,
      marginTop: 8,
    },
    cards: { marginTop: 24, gap: 16 },
    card: {
      borderRadius: theme.radii.lg,
      padding: 18,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    cardEmployer: { backgroundColor: theme.colors.secondary },
    cardField: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderMuted,
    },
    cardEmployerSelected: { borderColor: theme.colors.primary },
    cardFieldSelected: { borderColor: theme.colors.primary },
    cardDisabled: { opacity: 0.85 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: theme.radii.pill,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      marginTop: 14,
      fontSize: theme.typography.size.xl,
      fontFamily: theme.fonts.bold,
    },
    cardDesc: {
      marginTop: 6,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      lineHeight: 20,
    },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radii.pill,
    },
    tagText: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.semibold,
    },
    noticeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      alignItems: 'flex-start',
    },
    noticeTextOnDark: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.regular,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 18,
    },
    footer: { marginTop: 'auto', paddingTop: 24, gap: 16, alignItems: 'center' },
    logoutBtn: { paddingVertical: 4 },
    logoutText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
    },
  });

export default ViewChooserScreen;
