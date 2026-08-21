import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { dateKey, fmtDayShort, todayKey } from '@/utils/datetime';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type { AskConversation } from '@/types';

const PANEL_WIDTH = Math.min(Dimensions.get('window').width * 0.78, 330);

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

const groupOf = (updatedAt: string) => {
  const day = updatedAt.slice(0, 10);
  if (day === todayKey()) return 'TODAY';
  if (day === yesterdayKey()) return 'YESTERDAY';
  return fmtDayShort(updatedAt).toUpperCase();
};

/** Chat history lives in a left drawer — grouped by day, newest first. */
export const AskHistoryDrawer = ({
  visible,
  conversations,
  activeId,
  onOpen,
  onNewChat,
  onClose,
}: {
  visible: boolean;
  conversations: AskConversation[] | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 0 : -PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  let lastGroup = '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.drawerBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.drawerPanel,
            { width: PANEL_WIDTH, transform: [{ translateX: slide }] },
          ]}
        >
          <View style={[styles.drawerHead, { paddingTop: insets.top + 12 }]}>
            <Text style={styles.drawerLabel}>CHAT HISTORY</Text>
            <Pressable style={styles.drawerClose} onPress={onClose} hitSlop={8}>
              <Ionicons
                name="chevron-back"
                size={18}
                color={colors.secondary}
              />
            </Pressable>
          </View>

          <Pressable style={styles.drawerNew} onPress={onNewChat}>
            <Ionicons name="add" size={17} color={colors.secondary} />
            <Text style={styles.drawerNewText}>New chat</Text>
          </Pressable>

          {conversations === null ? (
            <ActivityIndicator color={colors.secondary} />
          ) : conversations.length === 0 ? (
            <Text style={styles.drawerEmpty}>
              No chats yet — ask your first question.
            </Text>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
              {conversations.map(c => {
                const group = groupOf(c.updatedAt);
                const showGroup = group !== lastGroup;
                lastGroup = group;
                return (
                  <View key={c.id}>
                    {showGroup ? (
                      <Text style={styles.drawerGroup}>{group}</Text>
                    ) : null}
                    <Pressable
                      style={styles.drawerRow}
                      onPress={() => onOpen(c.id)}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={16}
                        color={
                          c.id === activeId ? colors.primary : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.drawerRowText,
                          c.id === activeId && styles.drawerRowTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {c.title}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default AskHistoryDrawer;
