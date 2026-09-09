import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import Toast from 'react-native-toast-message';

import {
  AppToast,
  Button,
  CalendarModal,
  FilePreview,
  Input,
  useFilePreview,
} from '@/components/ui';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { MaterialSelect } from '@/components/MaterialSelect';
import {
  addReceiptLine,
  confirmReceiptToJob,
  deleteReceiptLine,
  discardReceipt,
  fetchKnownSuppliers,
  fetchReceiptLineItems,
  findDuplicateReceipt,
  retryReceiptExtraction,
  normaliseSupplier,
  updateReceiptHeader,
  updateReceiptLine,
  uploadAndExtractReceipt,
  type ExtractedReceipt,
  type ExtractStatus,
  type JobMaterial,
  type ReceiptConfidence,
  type ReceiptLine,
} from '@/services/jobs';
import { loadJobCache, saveJobCache } from '@/services/jobCache';
import { isOnline } from '@/offline/connectivity';
import { offlineActionBlocked } from '@/offline';
import { addMaterial as addMaterialOffline } from '@/offline/materialActions';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAddReceiptStyles } from '@/styles/addReceipt.styles';
import { acquirePhotos } from '@/utils/capturePhoto';
import { uuidv4 } from '@/utils/uuid';
import { toastError, toastSuccess } from '@/utils/toast';
import { fmtDateFull } from '@/utils/datetime';
import { fmtMoney } from '@/utils/format';
import type { MainStackParamList } from '@/types';

type ReviewLine = ReceiptLine & { confidence?: ReceiptConfidence };

const parseMoney = (v: string) => parseFloat(v.replace(',', '.')) || 0;

const fmtDate = fmtDateFull;

const CONFIDENCE_LABEL: Record<ReceiptConfidence, string> = {
  high: 'HIGH CONFIDENCE',
  medium: 'MEDIUM CONFIDENCE',
  low: 'LOW CONFIDENCE',
};

/**
 * Named spends only — there is deliberately no "Other" bucket. Anything that
 * doesn't fit gets typed in, so it lands as its own real category instead of
 * everything collapsing into one useless pile.
 */
const CATEGORIES = [
  'Materials',
  'Tools & equipment',
  'Plant hire',
  'Fuel',
  'PPE & safety',
  'Subcontractor',
  'Waste & skips',
  'Parking & tolls',
];

const AddReceiptScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAddReceiptStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'AddReceipt'>>();

  const [phase, setPhase] = useState<'choose' | 'extracting' | 'review'>(
    'choose',
  );
  const [manual, setManual] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);
  const [extractStatus, setExtractStatus] = useState<ExtractStatus | null>(null);
  const [rescanning, setRescanning] = useState(false);

  const [vendor, setVendor] = useState('');
  const [location, setLocation] = useState('');
  const [receiptDate, setReceiptDate] = useState<string>(''); // yyyy-mm-dd
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [category, setCategory] = useState('');
  const [suppliers, setSuppliers] = useState<string[] | null>(null);
  const [supplierSheet, setSupplierSheet] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [lines, setLines] = useState<ReviewLine[]>([]);

  const [saving, setSaving] = useState(false);

  // Edit sheets
  const [datePicker, setDatePicker] = useState(false);
  const preview = useFilePreview();
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
      setExtractStatus(res.status);
      if (res.extracted) {
        setVendor(res.extracted.vendor ?? '');
        setLocation(res.extracted.location ?? '');
        setReceiptDate(res.extracted.receipt_date ?? '');
      }
      await loadLines(res.receiptId, res.extracted);
      if (res.status !== 'extracted') {
        // Be straight about it rather than showing an empty "auto-extracted"
        // list: the photo is saved, the items just need typing (or a re-scan).
        setManual(true);
        Toast.show({
          type: 'info',
          text1:
            res.status === 'failed'
              ? 'Couldn’t read that receipt'
              : 'Scan is taking too long',
          text2: 'Add the items by hand, or tap Scan again.',
        });
      }
    } catch (e) {
      toastError(e, 'Could not upload the receipt.');
      navigation.goBack();
      return;
    }
    setPhase('review');
  };

  const addReceiptPhoto = async (closeOnCancel: boolean) => {
    const [asset] = await acquirePhotos({ quality: 0.8, maxSize: 1600 });
    if (!asset) {
      if (closeOnCancel) navigation.goBack();
      return;
    }
    setPhotoUri(asset.uri);
    runExtraction(asset.base64, asset.type);
  };

  const startScan = () => {
    if (!isOnline()) {
      setManual(true);
      setPhase('review');
      Toast.show({
        type: 'info',
        text1: 'Scanning needs a connection',
        text2: 'Enter the receipt’s items by hand instead.',
      });
      return;
    }
    addReceiptPhoto(false);
  };

  const startManual = () => {
    setManual(true);
    setPhase('review');
  };

  const rescan = async () => {
    if (!receiptId || rescanning) return;
    setRescanning(true);
    try {
      const res = await retryReceiptExtraction(receiptId);
      setExtractStatus(res.status);
      setExtracted(res.extracted);
      if (res.status === 'extracted') {
        setManual(false);
        if (res.extracted) {
          setVendor(prev => res.extracted?.vendor ?? prev);
          setLocation(prev => res.extracted?.location ?? prev);
          setReceiptDate(prev => res.extracted?.receipt_date ?? prev);
        }
        await loadLines(receiptId, res.extracted);
        toastSuccess('Receipt read — check the items below.');
      } else {
        toastError(
          new Error('Still couldn’t read it — add the items by hand.'),
          'Still couldn’t read it.',
        );
      }
    } finally {
      setRescanning(false);
    }
  };

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

  const updateLine = (
    id: string,
    patch: { description?: string; quantity?: number; unitPrice?: number },
  ) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
    if (!manual && receiptId) {
      updateReceiptLine(id, patch).catch(() => {});
    }
  };

  const removeLineInline = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
    if (!manual && receiptId) {
      deleteReceiptLine(id).catch(() => {});
    }
  };

  const saveLine = async () => {
    if (!lDesc.trim() || saving) return;
    if (manual || !receiptId) {
      const qty = Math.max(1, parseMoney(lQty) || 1);
      const price = parseMoney(lPrice);
      if (lineSheet === 'new') {
        setLines(prev => [
          ...prev,
          {
            id: uuidv4(),
            description: lDesc.trim(),
            quantity: qty,
            unitPrice: price,
            vat: null,
            confirmed: false,
          },
        ]);
      } else if (lineSheet) {
        setLines(prev =>
          prev.map(l =>
            l.id === lineSheet
              ? { ...l, description: lDesc.trim(), quantity: qty, unitPrice: price }
              : l,
          ),
        );
      }
      setLineSheet(null);
      return;
    }
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
    if (lineSheet === 'new' || !lineSheet || saving) return;
    if (manual || !receiptId) {
      setLines(prev => prev.filter(l => l.id !== lineSheet));
      setLineSheet(null);
      return;
    }
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

  const supplierMatches = (suppliers ?? []).filter(name => {
    const typed = normaliseSupplier(vendor);
    return !typed || normaliseSupplier(name).includes(typed);
  });

  const openSupplierSheet = () => {
    setSupplierSheet(true);
    if (suppliers === null) {
      fetchKnownSuppliers()
        .then(setSuppliers)
        .catch(() => setSuppliers([]));
    }
  };

  const pickSupplier = (name: string) => {
    setVendor(name);
    setSupplierSheet(false);
  };

  const saveHeader = async () => {
    if (manual || !receiptId || saving) return;
    setSaving(true);
    try {
      await updateReceiptHeader(receiptId, {
        vendor: vendor.trim(),
        receiptDate: receiptDate.trim() || null,
      });
    } catch (e) {
      toastError(e, 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Asks before logging what looks like the same spend twice — the user can
   * still go ahead, because split deliveries do happen.
   */
  const confirmNotDuplicate = async (): Promise<boolean> => {
    if (!isOnline() || !vendor.trim()) return true;
    const dupe = await findDuplicateReceipt({
      vendor: vendor.trim(),
      receiptDate: receiptDate.trim() || null,
      invoiceNumber: invoiceNumber.trim() || null,
      total,
      excludeReceiptId: receiptId,
    }).catch(() => null);
    if (!dupe) return true;

    const when = dupe.receiptDate ? fmtDate(dupe.receiptDate) : 'earlier';
    const ref = dupe.invoiceNumber ? ` (${dupe.invoiceNumber})` : '';
    return new Promise<boolean>(resolve => {
      Alert.alert(
        'Logged already?',
        `${dupe.vendor ?? 'This supplier'}${ref} for ${fmtMoney(
          dupe.total,
        )} is already on record from ${when}.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Save anyway', onPress: () => resolve(true) },
        ],
      );
    });
  };

  // ----- save to job / discard -----
  const saveToJob = async () => {
    if (saving) return;
    if (!(await confirmNotDuplicate())) return;
    if (manual || !receiptId) {
      if (offlineActionBlocked()) return;
      if (!lines.length) {
        toastError(new Error('no_lines'), 'Add at least one line first.');
        return;
      }
      setSaving(true);
      try {
        const results = await Promise.allSettled(
          lines.map(l =>
            addMaterialOffline({
              jobId: params.jobId,
              description: vendor.trim()
                ? `${l.description} (${vendor.trim()})`
                : l.description,
              quantity: l.quantity,
              unitCost: l.unitPrice,
              source: 'receipt',
            }),
          ),
        );
        const added: JobMaterial[] = results.flatMap(r =>
          r.status === 'fulfilled' ? [r.value.material] : [],
        );
        const queued = results.some(
          r => r.status === 'fulfilled' && r.value.queued,
        );
        if (added.length) {
          const cached = await loadJobCache(params.jobId);
          await saveJobCache(params.jobId, {
            materials: [...(cached?.materials ?? []), ...added],
          });
        }
        toastSuccess(
          queued
            ? `Saved offline — ${lines.length} item${lines.length === 1 ? '' : 's'} sync when you reconnect.`
            : `${lines.length} material${lines.length === 1 ? '' : 's'} added to the job.`,
        );
        navigation.goBack();
      } catch (e) {
        toastError(e, 'Could not save to job.');
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      await updateReceiptHeader(receiptId, {
        vendor: vendor.trim() || 'Receipt',
        receiptDate: receiptDate.trim() || null,
        vatAmount,
        invoiceNumber: invoiceNumber.trim() || null,
        category: category.trim() || null,
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

  if (phase === 'choose') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.topTitle}>Add receipt</Text>
          <View style={styles.cancelSpacer} />
        </View>
        <View style={[styles.flex, styles.centered]}>
          <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
          <Text style={styles.chooseTitle}>Add a receipt</Text>
          <Text style={styles.chooseText}>
            Snap it and we’ll pull out the items, or enter them by hand.
          </Text>
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            label="Scan receipt"
            leftIcon="camera"
            fullWidth
            onPress={startScan}
          />
          <Button
            label="Input manually"
            variant="outlined"
            color="secondary"
            fullWidth
            onPress={startManual}
          />
        </View>
        <AppToast />
      </View>
    );
  }

  if (phase === 'extracting') {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={colors.secondary} />
        <Text style={styles.extractingText}>Reading the receipt…</Text>
      </View>
    );
  }

  const headerDate = fmtDate(receiptDate);

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
          {manual
            ? 'Enter the receipt’s items by hand — add a line for each one.'
            : 'OCR pre-filled the items — edit any name, quantity or price right here.'}
        </Text>

        {/* Auto-extracted header card */}
        <View style={styles.autoCard}>
          {photoUri ? (
            <Pressable
              onPress={() =>
                preview.open([
                  { uri: photoUri, label: vendor || 'Receipt photo' },
                ])
              }
            >
              <Image source={{ uri: photoUri }} style={styles.thumb} />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand" size={12} color={colors.white} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={styles.autoBody}>
            <Text style={styles.autoLabel}>
              {manual ? 'MANUAL ENTRY' : 'AUTO-EXTRACTED · CHECK BEFORE SAVING'}
            </Text>
            <Text style={styles.autoVendor} numberOfLines={1}>
              {vendor || 'Unknown vendor'}
              {headerDate ? ` · ${headerDate}` : ''}
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
            {receiptId && extractStatus && extractStatus !== 'extracted' ? (
              <Pressable
                style={styles.rescanBtn}
                onPress={rescan}
                disabled={rescanning}
                hitSlop={6}
              >
                {rescanning ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <Ionicons
                    name="refresh"
                    size={14}
                    color={colors.secondary}
                  />
                )}
                <Text style={styles.rescanText}>
                  {rescanning ? 'Reading…' : 'Scan again'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Supplier */}
        <Text style={styles.sectionLabel}>SUPPLIER</Text>
        <Pressable style={styles.fieldCard} onPress={openSupplierSheet}>
          <View style={styles.fieldBody}>
            <Text style={styles.fieldValue}>{vendor || 'Pick a supplier'}</Text>
            {location ? <Text style={styles.fieldSub}>{location}</Text> : null}
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Date */}
        <Text style={styles.sectionLabel}>DATE</Text>
        <Pressable style={styles.fieldCard} onPress={() => setDatePicker(true)}>
          <Text style={styles.fieldValue}>{headerDate || 'Add date'}</Text>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Invoice / docket number */}
        <Text style={styles.sectionLabel}>INVOICE / DOCKET NO.</Text>
        <View style={styles.fieldCard}>
          <TextInput
            style={styles.fieldInput}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="e.g. INV-20482"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
          />
        </View>

        {/* Category */}
        <Text style={styles.sectionLabel}>CATEGORY</Text>
        <Pressable
          style={styles.fieldCard}
          onPress={() => setCategorySheet(true)}
        >
          <Text style={category ? styles.fieldValue : styles.fieldSub}>
            {category || 'What was this spend?'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
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
              <View
                key={l.id}
                style={[
                  styles.lineRow,
                  i === lines.length - 1 ? null : styles.lineDivider,
                ]}
              >
                <TextInput
                  defaultValue={l.description}
                  placeholder="Item name"
                  placeholderTextColor={colors.placeholder}
                  onEndEditing={e =>
                    updateLine(l.id, { description: e.nativeEvent.text })
                  }
                  style={styles.lineNameInput}
                />
                <TextInput
                  defaultValue={String(l.quantity)}
                  keyboardType="numeric"
                  textAlign="center"
                  onEndEditing={e =>
                    updateLine(l.id, {
                      quantity: Math.max(1, parseMoney(e.nativeEvent.text) || 1),
                    })
                  }
                  style={styles.lineQtyInput}
                />
                <View style={styles.linePriceWrap}>
                  <Text style={styles.linePriceEuro}>€</Text>
                  <TextInput
                    defaultValue={l.unitPrice ? String(l.unitPrice) : ''}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    textAlign="right"
                    onEndEditing={e =>
                      updateLine(l.id, {
                        unitPrice: parseMoney(e.nativeEvent.text),
                      })
                    }
                    style={styles.linePriceInput}
                  />
                </View>
                <Pressable onPress={() => removeLineInline(l.id)} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.placeholder}
                  />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptyLines}>
              No lines — tap “+ Add line” to enter them.
            </Text>
          )}
        </View>

        {/* Heads-up */}
        <View style={styles.headsUp}>
          <Text style={styles.headsUpLabel}>HEADS-UP</Text>
          <Text style={styles.headsUpText}>
            {manual
              ? 'Add each line you need — they save to the job as materials (and sync later if you’re offline).'
              : extracted?.issues
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

      {/* Supplier picker — known names first so spellings stay consistent */}
      <Modal
        visible={supplierSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setSupplierSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSupplierSheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.sheetTitle}>Supplier</Text>
            <Input
              label="Supplier name"
              value={vendor}
              onChangeText={setVendor}
              autoCapitalize="words"
            />
            {suppliers === null ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              <ScrollView
                style={styles.pickList}
                keyboardShouldPersistTaps="handled"
              >
                {supplierMatches.length === 0 ? (
                  <Text style={styles.pickEmpty}>
                    {vendor.trim()
                      ? 'New supplier — it will be added to the list.'
                      : 'No suppliers used yet.'}
                  </Text>
                ) : (
                  supplierMatches.map(name => (
                    <Pressable
                      key={name}
                      style={styles.pickRow}
                      onPress={() => pickSupplier(name)}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={16}
                        color={colors.textMuted}
                      />
                      <Text style={styles.pickRowText} numberOfLines={1}>
                        {name}
                      </Text>
                      {normaliseSupplier(name) === normaliseSupplier(vendor) ? (
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color={colors.primary}
                        />
                      ) : null}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            )}
            <AddressAutocomplete
              label="Location"
              value={location}
              onChangeText={setLocation}
            />
            <Button
              label="Done"
              fullWidth
              loading={saving}
              onPress={() => {
                setSupplierSheet(false);
                saveHeader();
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Category picker */}
      <Modal
        visible={categorySheet}
        transparent
        animationType="fade"
        onRequestClose={() => setCategorySheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCategorySheet(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.sheetTitle}>Category</Text>
            <ScrollView
              style={styles.pickList}
              keyboardShouldPersistTaps="handled"
            >
              {CATEGORIES.map(c => (
                <Pressable
                  key={c}
                  style={styles.pickRow}
                  onPress={() => {
                    setCategory(c);
                    setCategorySheet(false);
                  }}
                >
                  <Text style={styles.pickRowText}>{c}</Text>
                  {c === category ? (
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
            <Input
              label="Something else — name it"
              value={CATEGORIES.includes(category) ? '' : category}
              onChangeText={setCategory}
              autoCapitalize="sentences"
            />
            <Button
              label="Done"
              fullWidth
              onPress={() => setCategorySheet(false)}
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

      <CalendarModal
        visible={datePicker}
        value={receiptDate || null}
        title="Receipt date"
        onSelect={setReceiptDate}
        onClose={() => setDatePicker(false)}
      />
      <FilePreview {...preview.props} />
      <AppToast />
    </View>
  );
};

export default AddReceiptScreen;
