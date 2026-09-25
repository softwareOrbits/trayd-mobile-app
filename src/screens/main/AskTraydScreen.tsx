import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import {
  AskBlockCard,
  AskComposer,
  AskDraftCard,
  AskHistoryDrawer,
  AskTypingBubble,
} from '@/components/ask';
import {
  askTrayd,
  commitAskAction,
  fetchAskConversations,
  fetchAskMessages,
} from '@/services/askTrayd';
import { fetchMyMember } from '@/services/member';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { firstNameOf } from '@/utils/name';
import { toastError } from '@/utils/toast';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type {
  AskConversation,
  AskMessage,
  AskProposal,
  AskProposalDetail,
  MainStackParamList,
} from '@/types';

const AskTraydScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const storedName = useAppSelector(s => s.auth.user?.name);
  const unread = useAppSelector(s => s.notifications.unread);

  const [firstName, setFirstName] = useState(() => firstNameOf(storedName));
  const initials = (firstName || 'You').slice(0, 2).toUpperCase();
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<AskConversation[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openingThread, setOpeningThread] = useState(false);
  const [draft, setDraft] = useState('');

  const loadHistory = useCallback(
    () =>
      fetchAskConversations()
        .then(setHistory)
        .catch(() => setHistory([])),
    [],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (firstName) return undefined;
    let active = true;
    fetchMyMember()
      .then(me => active && setFirstName(firstNameOf(me.fullName)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [firstName]);

  const send = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || asking) return;

    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed, blocks: [] },
    ]);
    setAsking(true);
    try {
      const res = await askTrayd(trimmed, conversationId);
      setConversationId(res.conversationId);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.answer,
          blocks: res.blocks,
          proposal: res.proposal ?? null,
        },
      ]);
      loadHistory();
    } finally {
      setAsking(false);
    }
  };

  const newChat = () => {
    setDrawerOpen(false);
    setConversationId(null);
    setMessages([]);
  };

  const openThread = async (id: string) => {
    setDrawerOpen(false);
    setOpeningThread(true);
    try {
      const turns = await fetchAskMessages(id);
      setConversationId(id);
      setMessages(turns);
    } catch (e) {
      toastError(e, 'Could not open that chat.');
    } finally {
      setOpeningThread(false);
    }
  };

  const approve = (proposal: AskProposal) =>
    commitAskAction(proposal, conversationId);

  const requestEdit = (detail: AskProposalDetail) =>
    setDraft(`Change the ${detail.label.toLowerCase()} to `);

  const scrollToEnd = () => scrollRef.current?.scrollToEnd({ animated: true });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => {
            loadHistory();
            setDrawerOpen(true);
          }}
          hitSlop={8}
        >
          <Ionicons name="menu" size={26} color={colors.white} />
        </Pressable>

        <Text style={styles.title}>Ask Trayd</Text>

        <Pressable
          style={styles.bellWrap}
          onPress={() => navigation.navigate('Tabs', { screen: 'Notifications' })}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
          {unread > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.subBar}>
        <Pressable
          style={styles.chatsPill}
          onPress={() => {
            loadHistory();
            setDrawerOpen(true);
          }}
        >
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.chatsPillText}>Chats</Text>
        </Pressable>
        <Pressable style={styles.newChatBox} onPress={newChat} hitSlop={8}>
          <Ionicons name="add" size={20} color="#7a8391" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onContentSizeChange={scrollToEnd}
      >
        {messages.length === 0 && !openingThread ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {firstName
                ? `Hi ${firstName} — ask me anything.`
                : 'Ask me anything.'}
            </Text>
            <Text style={styles.emptyText}>
              I know your hours, jobs, leave and van. Type your question below.
            </Text>
          </View>
        ) : null}

        {openingThread ? (
          <ActivityIndicator color={colors.secondary} />
        ) : (
          messages.map(message =>
            message.role === 'user' ? (
              <View key={message.id} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{message.text}</Text>
                </View>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{initials}</Text>
                </View>
              </View>
            ) : (
              <View key={message.id} style={styles.botRow}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <View style={styles.botBubble}>
                  {message.text ? (
                    <Text style={styles.botText}>{message.text}</Text>
                  ) : null}
                  {message.blocks.map((block, i) => (
                    <AskBlockCard key={`${message.id}-b${i}`} block={block} />
                  ))}
                  {message.proposal ? (
                    <AskDraftCard
                      proposal={message.proposal}
                      onApprove={approve}
                      onEditRequest={requestEdit}
                    />
                  ) : null}
                </View>
              </View>
            ),
          )
        )}

        {asking ? <AskTypingBubble /> : null}
      </ScrollView>

      <AskComposer
        value={draft}
        onChangeText={setDraft}
        onSend={send}
        disabled={asking}
      />

      <AskHistoryDrawer
        visible={drawerOpen}
        conversations={history}
        activeId={conversationId}
        onOpen={openThread}
        onNewChat={newChat}
        onClose={() => setDrawerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default AskTraydScreen;
