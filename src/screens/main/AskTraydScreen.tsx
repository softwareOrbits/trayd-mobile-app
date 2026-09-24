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

import { ChatBubble } from '@/components/chat';
import {
  AskApprovalCard,
  AskBlockCard,
  AskComposer,
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

  const [firstName, setFirstName] = useState(() => firstNameOf(storedName));
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<AskConversation[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openingThread, setOpeningThread] = useState(false);

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
          <Ionicons name="menu" size={20} color={colors.white} />
        </Pressable>

        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={19} color={colors.white} />
        </Pressable>

        <View style={styles.titleCol}>
          <Text style={styles.title}>Ask Trayd</Text>
          <Text style={styles.subtitle}>Your hours, jobs & leave</Text>
        </View>
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
          messages.map(message => (
            <View key={message.id}>
              <ChatBubble
                message={{
                  id: message.id,
                  role: message.role,
                  text: message.text,
                }}
              />
              {message.blocks.length ? (
                <View style={styles.blockWrap}>
                  {message.blocks.map((block, i) => (
                    <AskBlockCard key={`${message.id}-b${i}`} block={block} />
                  ))}
                </View>
              ) : null}
              {message.proposal ? (
                <View style={styles.blockWrap}>
                  <AskApprovalCard
                    proposal={message.proposal}
                    onApprove={approve}
                  />
                </View>
              ) : null}
            </View>
          ))
        )}

        {asking ? <AskTypingBubble /> : null}
      </ScrollView>

      <AskComposer onSend={send} disabled={asking} />

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
