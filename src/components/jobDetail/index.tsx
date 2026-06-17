import { type ReactNode } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { JobMaterial } from '@/services/jobs';
import type { IconName } from '@/types';
import LocationMap from './LocationMap';

export { default as LocationMap } from './LocationMap';

// Local presentational types (kept here so these reusable blocks don't depend
// on any mock module). Used now by Section/InfoRow/Callout; the rest are ready
// for the deep-detail pass (materials/photos/roster/days).
export type InfoEntry = { label: string; value: string };
export type LineItemTag = 'VAN STOCK' | 'RECEIPT';
export type LineItem = { name: string; tag: LineItemTag; amount: string };
export type DayEntry = { label: string; sub: string; active?: boolean };
export type PhotoTag = { label: string; uri?: string };
export type RosterMember = { name: string; confirmed: boolean };

export const toLineItem = (m: JobMaterial): LineItem => ({
  name:
    m.source === 'receipt'
      ? m.description
      : `${m.description} × ${m.quantity}${m.unit ?? ''}`,
  tag: m.source === 'receipt' ? 'RECEIPT' : 'VAN STOCK',
  amount: `€${(m.quantity * m.unitCost).toFixed(2)}`,
});

/* ---------- Section (small-caps header + white card) ---------- */

export const Section = ({
  title,
  action,
  onAction,
  children,
  card = true,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  card?: boolean;
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
        {action ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text style={styles.sectionAction}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {card ? <View style={styles.card}>{children}</View> : children}
    </View>
  );
};

/* ---------- Label ↔ value row ---------- */

export const InfoRow = ({
  entry,
  last,
}: {
  entry: InfoEntry;
  last?: boolean;
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, last ? null : styles.rowDivider]}>
      <Text style={styles.rowLabel}>{entry.label}</Text>
      <Text style={styles.rowValue}>{entry.value}</Text>
    </View>
  );
};

/* ---------- Location card with Google Maps directions ---------- */

export const LocationCard = ({
  address,
  eircode,
}: {
  address: string | null;
  eircode?: string | null;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const destination = [eircode, address].filter(Boolean).join(', ');

  const openDirections = () => {
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      destination,
    )}`;
    Linking.openURL(url).catch(() =>
      Toast.show({ type: 'error', text1: 'Could not open Maps.' }),
    );
  };

  return (
    <View style={styles.locationCard}>
      {destination ? (
        <View style={styles.locationMap}>
          <LocationMap query={destination} onPress={openDirections} />
        </View>
      ) : null}
      <View style={styles.locationTop}>
        <View style={styles.locationPin}>
          <Ionicons name="location" size={18} color={colors.primary} />
        </View>
        <View style={styles.locationText}>
          <Text style={styles.locationLabel}>ADDRESS</Text>
          <Text style={styles.locationAddress}>
            {address ?? 'No address on file'}
          </Text>
          {eircode ? (
            <View style={styles.eircodeChip}>
              <Text style={styles.eircodeText}>EIRCODE · {eircode}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {destination ? (
        <Pressable style={styles.directionsBtn} onPress={openDirections}>
          <Ionicons name="navigate" size={17} color={colors.primary} />
          <Text style={styles.directionsText}>Get directions</Text>
          <Ionicons
            name="open-outline"
            size={15}
            color={colors.onSecondary}
            style={styles.directionsExt}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

/* ---------- Tag chip (VAN STOCK / RECEIPT / EMPLOYER-ONLY) ---------- */

export const TagChip = ({ label }: { label: string }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label.toUpperCase()}</Text>
    </View>
  );
};

/* ---------- Logged line item (name + tag + price) ---------- */

export const LineItemRow = ({
  item,
  last,
  editable,
}: {
  item: LineItem;
  last?: boolean;
  editable?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.lineItem, last ? null : styles.rowDivider]}>
      <View style={styles.lineItemMain}>
        <Text style={styles.lineItemName}>{item.name}</Text>
        <TagChip label={item.tag} />
      </View>
      <Text style={styles.lineItemAmount}>{item.amount}</Text>
      {editable ? (
        <Ionicons
          name="pencil"
          size={15}
          color={colors.textMuted}
          style={styles.lineItemEdit}
        />
      ) : null}
    </View>
  );
};

/* ---------- Roster chips ---------- */

export const RosterChips = ({ members }: { members: RosterMember[] }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.rosterRow}>
      {members.map(m => (
        <View
          key={m.name}
          style={[m.confirmed ? styles.rosterFilled : styles.rosterOutline]}
        >
          {m.confirmed ? (
            <Ionicons name="checkmark" size={13} color={colors.onSecondary} />
          ) : null}
          <Text
            style={
              m.confirmed ? styles.rosterFilledText : styles.rosterOutlineText
            }
          >
            {m.name}
          </Text>
        </View>
      ))}
    </View>
  );
};

/* ---------- Callout (note / success / info) ---------- */

export const Callout = ({
  variant,
  icon,
  children,
}: {
  variant: 'note' | 'success' | 'info';
  icon?: IconName;
  children: ReactNode;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const tone =
    variant === 'note'
      ? { bg: colors.warningBg, border: colors.warning, fg: colors.warning }
      : variant === 'success'
      ? { bg: '#E5F0E9', border: colors.green, fg: colors.green }
      : { bg: colors.surface, border: colors.borderMuted, fg: colors.textMuted };

  return (
    <View
      style={[
        styles.callout,
        { backgroundColor: tone.bg, borderColor: tone.border },
      ]}
    >
      {icon ? (
        variant === 'success' ? (
          <View style={[styles.calloutIconBox, { backgroundColor: tone.fg }]}>
            <Ionicons name={icon} size={16} color={colors.white} />
          </View>
        ) : (
          <Ionicons name={icon} size={18} color={tone.fg} />
        )
      ) : null}
      <View style={styles.calloutBody}>{children}</View>
    </View>
  );
};

/* ---------- Running timer card (active) ---------- */

export const TimerCard = ({
  time,
  onEdit,
}: {
  time: string;
  onEdit?: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.timerCard}>
      <View style={styles.timerIconBox}>
        <Ionicons name="time-outline" size={20} color={colors.onPrimary} />
      </View>
      <View style={styles.timerBody}>
        <Text style={styles.timerLabel}>TIMER · RUNNING</Text>
        <Text style={styles.timerValue}>{time}</Text>
      </View>
      <Pressable style={styles.timerEdit} onPress={onEdit} hitSlop={8}>
        <Text style={styles.timerEditText}>Edit</Text>
      </Pressable>
    </View>
  );
};

/* ---------- Paused-since card ---------- */

export const PausedCard = ({
  since,
  summary,
}: {
  since: string;
  summary: string;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.pausedCard}>
      <View style={styles.pausedIconBox}>
        <Ionicons name="time-outline" size={18} color={colors.textMuted} />
      </View>
      <View style={styles.pausedBody}>
        <Text style={styles.pausedLabel}>PAUSED SINCE {since}</Text>
        <Text style={styles.pausedSummary}>{summary}</Text>
      </View>
    </View>
  );
};

/* ---------- Days-so-far rows ---------- */

export const DayRow = ({ day, last }: { day: DayEntry; last?: boolean }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.dayRow,
        day.active ? styles.dayActive : null,
        last || day.active ? null : styles.rowDivider,
      ]}
    >
      <Text style={styles.dayLabel}>{day.label}</Text>
      <Text style={styles.daySub}>{day.sub}</Text>
    </View>
  );
};

/* ---------- Photo strip ---------- */

export const PhotoStrip = ({ photos }: { photos: PhotoTag[] }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.photoRow}>
      {photos.map((p, i) => (
        <View key={`${p.label}-${i}`} style={styles.photo}>
          {p.uri ? (
            <Image source={{ uri: p.uri }} style={styles.photoImg} />
          ) : (
            <Text style={styles.photoText}>{p.label}</Text>
          )}
        </View>
      ))}
    </View>
  );
};

/* ---------- Employer-only note bubble ---------- */

export const EmployerNote = ({
  time,
  text,
  tag = 'EMPLOYER-ONLY',
}: {
  time?: string;
  text: string;
  tag?: string;
}) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.employerNote}>
      <View style={styles.employerHead}>
        <TagChip label={tag} />
        {time ? <Text style={styles.employerTime}>{time}</Text> : null}
      </View>
      <Text style={styles.employerText}>{text}</Text>
    </View>
  );
};

/* ---------- 2×2 add-content grid ---------- */

export const ActionGrid = ({
  items,
}: {
  items: { icon: IconName; label: string; onPress: () => void }[];
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grid}>
      {items.map(it => (
        <Pressable key={it.label} style={styles.gridItem} onPress={it.onPress}>
          <Ionicons name={it.icon} size={18} color={colors.primary} />
          <Text style={styles.gridLabel}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    section: { marginTop: 18 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.5,
      color: theme.colors.textMuted,
    },
    sectionAction: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 16,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    rowLabel: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.sm,
    },
    rowValue: {
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      flexShrink: 1,
      textAlign: 'right',
    },

    locationCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 16,
    },
    locationMap: { marginBottom: 14 },
    locationTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    locationPin: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.warningBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationText: { flex: 1, gap: 4 },
    locationLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    locationAddress: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
      lineHeight: 21,
    },
    eircodeChip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 2,
    },
    eircodeText: {
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.secondary,
    },
    directionsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 14,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.md,
      paddingVertical: 13,
    },
    directionsText: {
      color: theme.colors.onSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    directionsExt: { opacity: 0.7 },

    tag: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tagText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },

    lineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      gap: 12,
    },
    lineItemMain: { flex: 1, gap: 6, alignItems: 'flex-start' },
    lineItemName: {
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.medium,
    },
    lineItemAmount: {
      color: theme.colors.text,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    lineItemEdit: { marginLeft: 10 },

    rosterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    rosterFilled: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    rosterFilledText: {
      color: theme.colors.onSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },
    rosterOutline: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    rosterOutlineText: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },

    callout: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderRadius: theme.radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    calloutIconBox: {
      width: 28,
      height: 28,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calloutBody: { flex: 1 },

    timerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.lg,
      padding: 14,
    },
    timerIconBox: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.md,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerBody: { flex: 1, gap: 2 },
    timerLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.onPrimary,
      opacity: 0.8,
    },
    timerValue: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.onPrimary,
      letterSpacing: 1,
    },
    timerEdit: {
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    timerEditText: {
      color: theme.colors.onSecondary,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
    },

    pausedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 14,
    },
    pausedIconBox: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pausedBody: { flex: 1, gap: 2 },
    pausedLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    pausedSummary: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },

    dayRow: { paddingVertical: 14, gap: 2 },
    dayActive: {
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      marginVertical: 4,
    },
    dayLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    daySub: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photo: {
      width: 64,
      height: 64,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    photoImg: { width: '100%', height: '100%' },
    photoText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.textMuted,
    },

    employerNote: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 14,
      gap: 8,
    },
    employerHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    employerTime: {
      fontSize: theme.typography.size.xs,
      fontFamily: theme.fonts.mono,
      color: theme.colors.textMuted,
    },
    employerText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 20,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: {
      flexGrow: 1,
      flexBasis: '47%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    gridLabel: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
  });
