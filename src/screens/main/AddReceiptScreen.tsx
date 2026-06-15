import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import Ionicons from '@react-native-vector-icons/ionicons';

import { Button, Input } from '@/components/ui';
import {
  addReceiptLine,
  confirmReceiptToJob,
  deleteReceiptLine,
  discardReceipt,
  fetchReceiptLineItems,
  updateReceiptHeader,
  updateReceiptLine,
  uploadAndExtractReceipt,
  type ExtractedReceipt,
  type ReceiptConfidence,
  type ReceiptLine,
} from '@/services/jobs';
import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { capturePhoto } from '@/utils/capturePhoto';
import { toastError, toastSuccess } from '@/utils/toast';
import type { MainStackParamList } from '@/types';

type ReviewLine = ReceiptLine & { confidence?: ReceiptConfidence };

const parseMoney = (v: string) => parseFloat(v.replace(',', '.')) || 0;
const fmtMoney = (n: number) => `€${n.toFixed(2)}`;

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const CONFIDENCE_LABEL: Record<ReceiptConfidence, string> = {
  high: 'HIGH CONFIDENCE',
  medium: 'MEDIUM CONFIDENCE',
  low: 'LOW CONFIDENCE',
};

const AddReceiptScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'AddReceipt'>>();

  const [phase, setPhase] = useState<'extracting' | 'review'>('extracting');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);

  const [vendor, setVendor] = useState('');
  const [location, setLocation] = useState('');
  const [receiptDate, setReceiptDate] = useState<string>(''); // yyyy-mm-dd
  const [receiptTime, setReceiptTime] = useState('');
  const [lines, setLines] = useState<ReviewLine[]>([]);

  const [saving, setSaving] = useState(false);

  // Edit sheets
  const [headerSheet, setHeaderSheet] = useState(false);
  const [lineSheet, setLineSheet] = useState<'new' | string | null>(null);
  const [lDesc, setLDesc] = useState('');
  const [lQty, setLQty] = useState('1');
  const [lPrice, setLPrice] = useState('');

  const loadLines = async (id: string, ex: ExtractedReceipt | null) => {
    const rows = await fetchReceiptLineItems(id);
    // The Edge Function replaces line items in extraction order, so overlay
    // per-line confidence from the response by index (best-effort).
    setLines(
      rows.map((r, i) => ({ ...r, confidence: ex?.line_items?.[i]?.confidence })),
    );
  };

  const runExtraction = async (base64: string, type?: string | null) => {
    setPhase('extracting');
    try {
      const res = await uploadAndExtractReceipt({
        jobId: params.jobId,
        base64,
        type,
      });
      setReceiptId(res.receiptId);
      setStoragePath(res.storagePath);
      setExtracted(res.extracted);
      if (res.extracted) {
        setVendor(res.extracted.vendor ?? '');
        setLocation(res.extracted.location ?? '');
        setReceiptDate(res.extracted.receipt_date ?? '');
        setReceiptTime(res.extracted.receipt_time ?? '');
      }
      await loadLines(res.receiptId, res.extracted);
    } catch (e) {
      toastError(e, 'Could not upload the receipt.');
      navigation.goBack();
      return;
    }
    setPhase('review');
  };

  const openCamera = async (closeOnCancel: boolean) => {
    const asset = await capturePhoto({ quality: 0.8, maxSize: 2000 });
    if (!asset) {
      if (closeOnCancel) navigation.goBack();
      return;
    }
    setPhotoUri(asset.uri);
    runExtraction(asset.base64, asset.type);
  };

  // Straight into the camera on open.
  const launched = useRef(false);
  useEffect(() => {
    if (launched.current) return;
    launched.current = true;
    openCamera(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- totals (recomputed from the editable lines) -----
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vatFromLines = lines.reduce(
    (s, l) => s + (l.quantity * l.unitPrice * (l.vat ?? 0)) / 100,
    0,
  );
  const vatAmount = vatFromLines > 0 ? vatFromLines : extracted?.vat_amount ?? 0;
  const total = subtotal + vatAmount;
  const vatPct =
    extracted?.line_items?.find(l => l.vat_rate)?.vat_rate ??
    (subtotal > 0 ? Math.round((vatAmount / subtotal) * 100) : 0);

  // ----- line edit sheet -----
  const openNewLine = () => {
    setLDesc('');
    setLQty('1');
    setLPrice('');
    setLineSheet('new');
  };
  const openEditLine = (l: ReviewLine) => {
    setLDesc(l.description);
    setLQty(String(l.quantity));
    setLPrice(l.unitPrice ? String(l.unitPrice) : '');
    setLineSheet(l.id);
  };

  const saveLine = async () => {
    if (!receiptId || !lDesc.trim() || saving) return;
    setSaving(true);
    try {
      if (lineSheet === 'new') {
        await addReceiptLine({
          receiptId,
          description: lDesc.trim(),
          quantity: Math.max(1, parseMoney(lQty) || 1),
          unitPrice: parseMoney(lPrice),
        });
      } else if (lineSheet) {
        await updateReceiptLine(lineSheet, {
          description: lDesc.trim(),
          quantity: Math.max(1, parseMoney(lQty) || 1),
          unitPrice: parseMoney(lPrice),
        });
      }
      await loadLines(receiptId, extracted);
      setLineSheet(null);
    } catch (e) {
      toastError(e, 'Could not save the line.');
    } finally {
      setSaving(false);
    }
  };

  const removeLine = async () => {
    if (!receiptId || lineSheet === 'new' || !lineSheet || saving) return;
    setSaving(true);
    try {
      await deleteReceiptLine(lineSheet);
      await loadLines(receiptId, extracted);
      setLineSheet(null);
    } catch (e) {
      toastError(e, 'Could not delete the line.');
    } finally {
      setSaving(false);
    }
  };

  const saveHeader = async () => {
    if (!receiptId || saving) return;
    setSaving(true);
    try {
      await updateReceiptHeader(receiptId, {
        vendor: vendor.trim(),
        receiptDate: receiptDate.trim() || null,
      });
      setHeaderSheet(false);
    } catch (e) {
      toastError(e, 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  // ----- save to job / discard -----
  const saveToJob = async () => {
    if (!receiptId || saving) return;
    setSaving(true);
    try {
      await updateReceiptHeader(receiptId, {
        vendor: vendor.trim() || 'Receipt',
        receiptDate: receiptDate.trim() || null,
        vatAmount,
      });
      const created = await confirmReceiptToJob(receiptId);
      toastSuccess(
        `${created} material${created === 1 ? '' : 's'} added to the job.`,
      );
      navigation.goBack();
    } catch (e) {
      toastError(e, 'Could not save to job.');
      setSaving(false);
    }
  };

  const discard = () => {
    if (saving) return;
    if (receiptId) {
      discardReceipt(receiptId, storagePath).catch(() => {});
    }
    navigation.goBack();
  };

  if (phase === 'extracting') {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
        <Text style={styles.extractingText}>Reading the receipt…</Text>
      </View>
    );
  }

  const headerSub = [fmtDate(receiptDate), receiptTime]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={discard} hitSlop={8}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.topTitle}>Review receipt</Text>
        <View style={styles.cancelSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          OCR pre-filled most fields. Tap to correct anything.
        </Text>

        {/* Auto-extracted header card */}
        <View style={styles.autoCard}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.thumb} />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={styles.autoBody}>
            <Text style={styles.autoLabel}>
              AUTO-EXTRACTED · CHECK BEFORE SAVING
            </Text>
            <Text style={styles.autoVendor} numberOfLines={1}>
              {vendor || 'Unknown vendor'}
              {headerSub ? ` · ${headerSub}` : ''}
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{lines.length} ITEMS</Text>
              </View>
              {vatPct ? (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>VAT {vatPct}%</Text>
                </View>
              ) : null}
            </View>
            {extracted ? (
              <View
                style={[
                  styles.confBanner,
                  extracted.overall_confidence === 'low'
                    ? styles.confLow
                    : styles.confMed,
                ]}
              >
                <Text style={styles.confText}>
                  {CONFIDENCE_LABEL[extracted.overall_confidence]}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Vendor */}
        <Text style={styles.sectionLabel}>VENDOR</Text>
        <Pressable style={styles.fieldCard} onPress={() => setHeaderSheet(true)}>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldValue}>{vendor || 'Add vendor'}</Text>
            {location ? <Text style={styles.fieldSub}>{location}</Text> : null}
          </View>
          <Ionicons name="pencil" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Date & time */}
        <Text style={styles.sectionLabel}>DATE &amp; TIME</Text>
        <Pressable style={styles.fieldCard} onPress={() => setHeaderSheet(true)}>
          <Text style={styles.fieldValue}>{headerSub || 'Add date'}</Text>
          <Ionicons name="pencil" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Line items */}
        <View style={styles.lineHead}>
          <Text style={styles.sectionLabel}>LINE ITEMS · {lines.length}</Text>
          <Pressable onPress={openNewLine} hitSlop={8}>
            <Text style={styles.addLink}>+ Add line</Text>
          </Pressable>
        </View>
        <View style={styles.linesCard}>
          {lines.length ? (
            lines.map((l, i) => (
              <Pressable
                key={l.id}
                style={[
                  styles.lineRow,
                  i === lines.length - 1 ? null : styles.lineDivider,
                ]}
                onPress={() => openEditLine(l)}
              >
                <View style={styles.lineMain}>
                  <Text style={styles.lineDesc}>
                    {l.description}
                    {l.quantity > 1 ? ` × ${l.quantity}` : ''}
                  </Text>
                  {l.confidence === 'low' ? (
                    <Text style={styles.lineLow}>
                      LOW CONFIDENCE — TAP TO CHECK
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.lineAmount}>
                  {fmtMoney(l.quantity * l.unitPrice)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.placeholder}
                />
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyLines}>
              No lines — tap “+ Add line” to enter them manually.
            </Text>
          )}
        </View>

        {/* Heads-up */}
        <View style={styles.headsUp}>
          <Text style={styles.headsUpLabel}>HEADS-UP</Text>
          <Text style={styles.headsUpText}>
            {extracted?.issues
              ? extracted.issues
              : 'If OCR misses lines entirely, you can add them manually — the job is never blocked by an OCR failure.'}
          </Text>
        </View>

        {/* Totals */}
        <Text style={styles.sectionLabel}>TOTALS</Text>
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtMoney(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT ({vatPct}%)</Text>
            <Text style={styles.totalValue}>{fmtMoney(vatAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowLast]}>
            <Text style={styles.totalStrong}>Total</Text>
            <Text style={styles.totalStrong}>{fmtMoney(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Save to job"
          fullWidth
          loading={saving}
          onPress={saveToJob}
        />
        <Pressable onPress={discard} hitSlop={8} style={styles.discardBtn}>
          <Text style={styles.discardText}>Discard receipt</Text>
        </Pressable>
      </View>

      {/* Vendor / date edit sheet */}
      <Modal
        visible={headerSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setHeaderSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setHeaderSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.sheetTitle}>Vendor &amp; date</Text>
            <Input label="Vendor" value={vendor} onChangeText={setVendor} />
            <Input
              label="Location (optional)"
              value={location}
              onChangeText={setLocation}
            />
            <Input
              label="Date (YYYY-MM-DD)"
              placeholder="2026-05-14"
              value={receiptDate}
              onChangeText={setReceiptDate}
              autoCapitalize="none"
            />
            <Button
              label="Done"
              fullWidth
              loading={saving}
              onPress={saveHeader}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Line edit sheet */}
      <Modal
        visible={lineSheet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLineSheet(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setLineSheet(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.sheetTitle}>
              {lineSheet === 'new' ? 'Add line' : 'Edit line'}
            </Text>
            <Input
              label="Description"
              placeholder="e.g. Copper pipe 22mm × 1m"
              value={lDesc}
              onChangeText={setLDesc}
            />
            <View style={styles.sheetRow}>
              <Input
                label="Qty"
                keyboardType="numeric"
                value={lQty}
                onChangeText={setLQty}
                containerStyle={styles.sheetRowItem}
              />
              <Input
                label="Unit price (€)"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={lPrice}
                onChangeText={setLPrice}
                containerStyle={styles.sheetRowItem}
              />
            </View>
            <Button
              label="Save line"
              fullWidth
              loading={saving}
              disabled={!lDesc.trim()}
              onPress={saveLine}
            />
            {lineSheet !== 'new' ? (
              <Pressable onPress={removeLine} hitSlop={8} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete line</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.background },
    centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
    extractingText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    cancel: {
      width: 56,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    cancelSpacer: { width: 56 },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    content: { paddingHorizontal: 20, paddingBottom: 24 },
    subtitle: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      marginBottom: 14,
    },

    autoCard: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 12,
    },
    thumb: {
      width: 54,
      height: 64,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
    },
    autoBody: { flex: 1, gap: 6 },
    autoLabel: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    autoVendor: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    chipRow: { flexDirection: 'row', gap: 6 },
    chip: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    chipText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.secondary,
    },
    confBanner: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    confMed: { backgroundColor: theme.colors.warningBg },
    confLow: { backgroundColor: '#F6D9D2' },
    confText: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.6,
      color: theme.colors.text,
    },

    sectionLabel: {
      marginTop: 20,
      marginBottom: 8,
      fontSize: 11,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1.2,
      color: theme.colors.textMuted,
    },
    fieldCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    fieldBody: { flex: 1, gap: 2 },
    fieldValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    fieldSub: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
    },

    lineHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
      marginBottom: 8,
    },
    addLink: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.primary,
    },
    linesCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 13,
    },
    lineDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    lineMain: { flex: 1, gap: 3 },
    lineDesc: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
    },
    lineLow: {
      fontSize: 9,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.5,
      color: theme.colors.primary,
    },
    lineAmount: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    emptyLines: {
      paddingVertical: 16,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },

    headsUp: {
      marginTop: 18,
      backgroundColor: theme.colors.warningBg,
      borderRadius: theme.radii.md,
      padding: 12,
      gap: 4,
    },
    headsUpLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.textMuted,
    },
    headsUpText: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.text,
      lineHeight: 19,
    },

    totalsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingHorizontal: 14,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    totalRowLast: { borderBottomWidth: 0 },
    totalLabel: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
    },
    totalValue: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.text,
    },
    totalStrong: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 10,
      borderTopWidth: 0.5,
      borderTopColor: theme.colors.borderMuted,
    },
    discardBtn: { alignSelf: 'center', paddingVertical: 4 },
    discardText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.textMuted,
      textDecorationLine: 'underline',
    },

    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.lg,
      borderTopRightRadius: theme.radii.lg,
      padding: 20,
      gap: 14,
    },
    sheetTitle: {
      fontSize: theme.typography.size.lg,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text,
    },
    sheetRow: { flexDirection: 'row', gap: 12 },
    sheetRowItem: { flex: 1 },
    deleteBtn: { alignSelf: 'center', paddingVertical: 4 },
    deleteText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.error,
    },
  });

export default AddReceiptScreen;
