import { type ReactNode } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { IconName } from '@/types';
import LocationMap from './LocationMap';
import { makeStyles } from './styles';
import type {
  InfoEntry,
  LineItem,
  DayEntry,
  PhotoTag,
  RosterMember,
} from './types';

export { default as LocationMap } from './LocationMap';
export type {
  InfoEntry,
  LineItemTag,
  LineItem,
  DayEntry,
  PhotoTag,
  RosterMember,
} from './types';

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
  const mapQuery = address || destination;

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
      {mapQuery ? (
        <View style={styles.locationMap}>
          <LocationMap query={mapQuery} onPress={openDirections} />
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
  const dotColor = (m: RosterMember) =>
    m.working
      ? colors.primary
      : m.working === false
      ? colors.textMuted
      : colors.borderMuted;
  const statusLabel = (m: RosterMember) =>
    m.working ? 'WORKING' : m.working === false ? 'PAUSED' : 'NOT IN';
  const statusColor = (m: RosterMember) =>
    m.working ? colors.primary : colors.textMuted;
  return (
    <View style={styles.rosterList}>
      {members.map(m => (
        <View key={m.name} style={styles.rosterMemberRow}>
          <View style={styles.rosterMemberLeft}>
            <View style={[styles.rosterDot, { backgroundColor: dotColor(m) }]} />
            <Text style={styles.rosterMemberName} numberOfLines={1}>
              {m.name}
            </Text>
          </View>
          <View style={styles.rosterStatusPill}>
            <Text style={[styles.rosterMemberStatus, { color: statusColor(m) }]}>
              {statusLabel(m)}
            </Text>
          </View>
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
  status = 'RUNNING',
  onEdit,
}: {
  time: string;
  status?: string;
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
        <Text style={styles.timerLabel}>YOUR TIMER · {status}</Text>
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

const PHOTO_PHASES = [
  { match: 'BEFORE', label: 'Before' },
  { match: 'MID', label: 'Mid-job' },
  { match: 'AFTER', label: 'After' },
] as const;

const Thumb = ({
  photo,
  onDelete,
}: {
  photo: PhotoTag;
  onDelete?: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.photo}>
      {photo.uri ? (
        <Image source={{ uri: photo.uri }} style={styles.photoImg} />
      ) : (
        <Text style={styles.photoText}>{photo.label}</Text>
      )}
      {onDelete ? (
        <Pressable style={styles.photoRemove} onPress={onDelete} hitSlop={10}>
          <Ionicons name="close" size={13} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
};

export const PhotoStrip = ({
  photos,
  grouped,
  onDelete,
}: {
  photos: PhotoTag[];
  grouped?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const styles = useThemedStyles(makeStyles);
  const deleteFor = (p: PhotoTag) =>
    onDelete && p.id ? () => onDelete(p.id as string) : undefined;

  if (!grouped) {
    return (
      <View style={styles.photoRow}>
        {photos.map((p, i) => (
          <Thumb key={p.id ?? `${p.label}-${i}`} photo={p} onDelete={deleteFor(p)} />
        ))}
      </View>
    );
  }

  const groups: { label: string; items: PhotoTag[] }[] = PHOTO_PHASES.map(
    phase => ({
      label: phase.label,
      items: photos.filter(p => p.label.startsWith(phase.match)),
    }),
  );
  const known = new Set(groups.flatMap(g => g.items));
  const other = photos.filter(p => !known.has(p));
  if (other.length) groups.push({ label: 'Other', items: other });

  return (
    <View style={styles.photoGroups}>
      {groups
        .filter(g => g.items.length > 0)
        .map(group => (
          <View key={group.label} style={styles.photoGroup}>
            <Text style={styles.photoGroupLabel}>
              {`${group.label} · ${group.items.length}`}
            </Text>
            <View style={styles.photoRow}>
              {group.items.map((p, i) => (
                <Thumb
                  key={p.id ?? `${group.label}-${i}`}
                  photo={p}
                  onDelete={deleteFor(p)}
                />
              ))}
            </View>
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
