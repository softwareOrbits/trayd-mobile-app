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

import { AppToast, Button, Input } from '@/components/ui';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MaterialSelect } from '@/components/MaterialSelect';
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
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAddReceiptStyles } from '@/styles/addReceipt.styles';
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
  const styles = useThemedStyles(makeAddReceiptStyles);
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
    const asset = await capturePhoto({ quality: 0.8, maxSize: 1600 });
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
            <AddressAutocomplete
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
            <MaterialSelect
              label="Item"
              placeholder="Search materials or add your own"
              value={
                lDesc
                  ? { materialId: null, name: lDesc, unit: null, sellPrice: null }
                  : null
              }
              onChange={m => {
                setLDesc(m.name);
                if (m.sellPrice != null) setLPrice(String(m.sellPrice));
              }}
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
      <AppToast />
    </View>
  );
};

export default AddReceiptScreen;
