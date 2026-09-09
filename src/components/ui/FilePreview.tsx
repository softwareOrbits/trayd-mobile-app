import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError } from '@/utils/toast';

export type PreviewFile = {
  uri: string;
  label?: string;
  kind?: 'image' | 'file';
};

const DOCUMENT_EXT = /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip)(\?|$)/i;

export const previewKindOf = (file: PreviewFile): 'image' | 'file' =>
  file.kind ?? (DOCUMENT_EXT.test(file.uri) ? 'file' : 'image');

export const FilePreview = ({
  visible,
  items,
  startIndex = 0,
  onClose,
}: {
  visible: boolean;
  items: PreviewFile[];
  startIndex?: number;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(startIndex);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!visible) return;
    setIndex(startIndex);
    setLoaded({});
    setBroken({});
  }, [visible, startIndex]);

  const current = items[index];
  const openExternally = async (uri: string) => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (!supported) throw new Error('unsupported');
      await Linking.openURL(uri);
    } catch {
      toastError(new Error('No app on this phone can open that file.'), '');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
          <Pressable style={styles.barBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
          {items.length > 1 ? (
            <Text style={styles.counter}>{`${index + 1} / ${items.length}`}</Text>
          ) : (
            <View style={styles.barBtn} />
          )}
          {current && previewKindOf(current) === 'image' ? (
            <Pressable
              style={styles.barBtn}
              onPress={() => openExternally(current.uri)}
              hitSlop={10}
            >
              <Ionicons name="open-outline" size={20} color={colors.white} />
            </Pressable>
          ) : (
            <View style={styles.barBtn} />
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={items.length > 1}
          onLayout={() =>
            scrollRef.current?.scrollTo({
              x: startIndex * width,
              animated: false,
            })
          }
          onMomentumScrollEnd={e =>
            setIndex(
              Math.max(
                0,
                Math.min(
                  items.length - 1,
                  Math.round(e.nativeEvent.contentOffset.x / width),
                ),
              ),
            )
          }
        >
          {items.map((file, i) => (
            <View key={`${file.uri}-${i}`} style={{ width, height }}>
              {previewKindOf(file) === 'image' ? (
                <View style={styles.page}>
                  {broken[i] ? (
                    <View style={styles.fileCard}>
                      <Ionicons
                        name="image-outline"
                        size={40}
                        color={colors.white}
                      />
                      <Text style={styles.fileText}>
                        This image could not be loaded.
                      </Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.image}
                      resizeMode="contain"
                      onLoadEnd={() =>
                        setLoaded(prev => ({ ...prev, [i]: true }))
                      }
                      onError={() =>
                        setBroken(prev => ({ ...prev, [i]: true }))
                      }
                    />
                  )}
                  {!loaded[i] && !broken[i] ? (
                    <ActivityIndicator
                      style={styles.spinner}
                      color={colors.white}
                    />
                  ) : null}
                </View>
              ) : (
                <View style={styles.page}>
                  <View style={styles.fileCard}>
                    <Ionicons
                      name="document-text-outline"
                      size={44}
                      color={colors.white}
                    />
                    <Text style={styles.fileText}>
                      {file.label ?? 'Attached document'}
                    </Text>
                    <Pressable
                      style={styles.openBtn}
                      onPress={() => openExternally(file.uri)}
                    >
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.onPrimary}
                      />
                      <Text style={styles.openText}>Open file</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {current?.label ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.label} numberOfLines={2}>
              {current.label}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export const useFilePreview = () => {
  const [state, setState] = useState<{
    items: PreviewFile[];
    index: number;
  } | null>(null);

  const close = () => setState(null);

  return {
    open: (items: PreviewFile[], index = 0) => {
      const usable = items.filter(f => !!f.uri);
      if (!usable.length) return;
      setState({ items: usable, index: Math.max(0, Math.min(index, usable.length - 1)) });
    },
    close,
    props: {
      visible: state !== null,
      items: state?.items ?? [],
      startIndex: state?.index ?? 0,
      onClose: close,
    },
  };
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(8,12,20,0.96)' },
    bar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
    barBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    counter: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 1,
      color: theme.colors.white,
    },
    page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width: '100%', height: '100%' },
    spinner: { position: 'absolute' },
    fileCard: { alignItems: 'center', gap: 14, paddingHorizontal: 32 },
    fileText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.white,
      textAlign: 'center',
    },
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.primary,
    },
    openText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onPrimary,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 14,
    },
    label: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.white,
      textAlign: 'center',
    },
  });

export default FilePreview;
