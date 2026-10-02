import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  type ComposerAttachment,
} from '@/components/ask';
import {
  ASK_UPLOAD_MAX_BYTES,
  ASK_UPLOAD_TYPES,
  askTrayd,
  commitAskAction,
  fetchAskConversations,
  fetchAskMessages,
  removeAskFile,
  uploadAskFile,
} from '@/services/askTrayd';
import { pickAttachments } from '@/utils/pickAttachments';
import { FilePreview, useFilePreview } from '@/components/ui';
import { PAGE_SIZE } from '@/utils/pagination';
import { fetchMyMember } from '@/services/member';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { firstNameOf } from '@/utils/name';
import { toastError } from '@/utils/toast';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';
import type {
  AskAttachment,
  AskCommitResult,
  AskConversation,
  AskMessage,
  AskProposal,
  MainStackParamList,
} from '@/types';

const MAX_ATTACHMENTS = 10;

type TileTone = 'amber' | 'navy' | 'green';

const TILE_TONE: Record<TileTone, { bg: string; fg: string }> = {
  amber: { bg: '#FCEBD1', fg: '#9A5B0A' },
  navy: { bg: '#DDE6F2', fg: '#16345A' },
  green: { bg: '#DCE8E0', fg: '#2F5C45' },
};

type Tile = {
  title: string;
  sub: string;
  query: string;
  icon: 'document-text-outline' | 'calendar-outline' | 'car-outline' | 'people-outline' | 'time-outline' | 'checkbox-outline' | 'sunny-outline';
  tone: TileTone;
};

const OWNER_TILES: Tile[] = [
  { title: 'Create an invoice', sub: 'For a customer, as a draft', query: 'Create an invoice', icon: 'document-text-outline', tone: 'amber' },
  { title: 'Today’s jobs', sub: 'Where the team is and what’s next', query: 'What jobs are on today?', icon: 'calendar-outline', tone: 'navy' },
  { title: 'Vehicles', sub: 'NCT, tax, service due', query: 'Which vans have NCT or tax due soon?', icon: 'car-outline', tone: 'navy' },
  { title: 'Team & leave', sub: 'Who’s off, balances, certs', query: 'Who is off this week?', icon: 'people-outline', tone: 'green' },
];

const EMPLOYEE_TILES: Tile[] = [
  { title: 'My jobs today', sub: 'Where I’m going and what’s next', query: 'What are my jobs today?', icon: 'calendar-outline', tone: 'amber' },
  { title: 'My hours', sub: 'This week’s timesheet', query: 'How many hours have I done this week?', icon: 'time-outline', tone: 'navy' },
  { title: 'My tasks', sub: 'What’s due and when', query: 'What tasks do I have due?', icon: 'checkbox-outline', tone: 'navy' },
  { title: 'My leave', sub: 'Balance and upcoming days off', query: 'How much leave do I have left?', icon: 'sunny-outline', tone: 'green' },
];

const OWNER_CHIPS = ['Who’s on site today?', 'Unpaid invoices', 'Van NCT due?'];
const EMPLOYEE_CHIPS = ['What’s my next job?', 'My van', 'Certs expiring?'];

type PendingAttachment = ComposerAttachment & { ref?: AskAttachment };

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
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const isOwner = useAppSelector(s => s.auth.isOwner);
  const preview = useFilePreview();

  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const historyBusy = useRef(false);

  const loadHistory = useCallback(
    () =>
      fetchAskConversations({ offset: 0, limit: PAGE_SIZE })
        .then(rows => {
          setHistory(rows);
          setHistoryHasMore(rows.length === PAGE_SIZE);
        })
        .catch(() => setHistory([])),
    [],
  );

  const loadMoreHistory = async () => {
    if (historyBusy.current || !historyHasMore || history === null) return;
    historyBusy.current = true;
    setHistoryLoadingMore(true);
    try {
      const rows = await fetchAskConversations({
        offset: history.length,
        limit: PAGE_SIZE,
      });
      setHistory(prev => {
        const seen = new Set((prev ?? []).map(c => c.id));
        return [...(prev ?? []), ...rows.filter(c => !seen.has(c.id))];
      });
      setHistoryHasMore(rows.length === PAGE_SIZE);
    } catch {
      setHistoryHasMore(false);
    } finally {
      historyBusy.current = false;
      setHistoryLoadingMore(false);
    }
  };

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

  const attach = async () => {
    const room = MAX_ATTACHMENTS - pending.length;
    if (room <= 0) {
      toastError(
        new Error(`You can attach up to ${MAX_ATTACHMENTS} files.`),
        '',
      );
      return;
    }
    const picked = await pickAttachments(room);
    for (const file of picked) {
      const bytes = Math.floor((file.base64.length * 3) / 4);
      if (!ASK_UPLOAD_TYPES.includes(file.mediaType)) {
        toastError(new Error(`${file.name}: only photos can be attached.`), '');
        continue;
      }
      if (bytes > ASK_UPLOAD_MAX_BYTES) {
        toastError(new Error(`${file.name} is over 10 MB.`), '');
        continue;
      }
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setPending(prev => [
        ...prev,
        {
          id,
          name: file.name,
          mediaType: file.mediaType,
          previewUri: file.previewUri,
          status: 'uploading',
        },
      ]);
      uploadAskFile(file)
        .then(ref =>
          setPending(prev =>
            prev.map(a => (a.id === id ? { ...a, status: 'ready', ref } : a)),
          ),
        )
        .catch(() =>
          setPending(prev =>
            prev.map(a => (a.id === id ? { ...a, status: 'failed' } : a)),
          ),
        );
    }
  };

  const previewFiles = (files: AskAttachment[], index: number) => {
    const images = files.filter(f => f.previewUri);
    const start = images.indexOf(files[index]);
    preview.open(
      images.map(f => ({
        uri: f.previewUri as string,
        label: f.name,
        kind: 'image' as const,
      })),
      Math.max(start, 0),
    );
  };

  const previewPending = (id: string) => {
    const ready = pending.filter(a => a.status === 'ready' && a.ref);
    const index = ready.findIndex(a => a.id === id);
    if (index < 0) return;
    previewFiles(
      ready.map(a => a.ref as AskAttachment),
      index,
    );
  };

  const removeAttachment = (id: string) =>
    setPending(prev => {
      const target = prev.find(a => a.id === id);
      if (target?.ref) removeAskFile(target.ref.path);
      return prev.filter(a => a.id !== id);
    });

  const send = async (query: string) => {
    const ready = pending.filter(a => a.status === 'ready' && a.ref);
    const trimmed =
      query.trim() || (ready.length ? 'Here are the files I attached.' : '');
    if (!trimmed || asking) return;
    const files = ready.map(a => a.ref as AskAttachment);

    setPending([]);
    setMessages(prev => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text: query.trim(),
        blocks: [],
        attachments: files,
      },
    ]);
    setAsking(true);
    try {
      const res = await askTrayd(
        trimmed,
        conversationId,
        files.map(f => ({ path: f.path, media_type: f.media_type })),
      );
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

  const approve = (proposal: AskProposal, input?: Record<string, unknown>) =>
    commitAskAction(proposal, conversationId, input);

  const openCreated = (result: AskCommitResult) => {
    const id = result.id;
    switch ((result.entity ?? '').toLowerCase()) {
      case 'job':
      case 'quotation':
        return id
          ? {
              label: 'Open in Jobs',
              go: () => navigation.navigate('JobDetail', { jobId: id }),
            }
          : null;
      case 'task':
        return id
          ? {
              label: 'Open in Tasks',
              go: () => navigation.navigate('TaskDetail', { taskId: id }),
            }
          : null;
      case 'certification':
        return {
          label: 'Open in Certifications',
          go: () => navigation.navigate('Certifications'),
        };
      case 'public holiday':
        return {
          label: 'Open in Leave',
          go: () => navigation.navigate('Tabs', { screen: 'Leave' }),
        };
      case 'van':
        return {
          label: 'Open in Fleet',
          go: () => navigation.navigate('Tabs', { screen: 'Fleet' }),
        };
      default:
        return null;
    }
  };

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
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : navigation.navigate('Tabs', { screen: 'Home' })
          }
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
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
          <View>
            <View style={styles.greet}>
              <View style={styles.greetAvatar}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={styles.greetText}>
                <Text style={styles.greetTitle}>
                  {firstName ? `Hey, ${firstName}.` : 'Hey there.'}
                </Text>
                <Text style={styles.greetSub}>
                  {isOwner
                    ? 'Ask about your jobs, invoices, hours, fleet or team.'
                    : 'Ask about your jobs, hours, leave, tasks or van.'}
                </Text>
              </View>
            </View>

            <Text style={styles.suggestLabel}>TRY ASKING</Text>
            <View style={styles.tileGrid}>
              {(isOwner ? OWNER_TILES : EMPLOYEE_TILES).map(tile => (
                <Pressable
                  key={tile.title}
                  style={styles.tile}
                  onPress={() => send(tile.query)}
                  disabled={asking}
                >
                  <View style={[styles.tileIcon, { backgroundColor: TILE_TONE[tile.tone].bg }]}>
                    <Ionicons name={tile.icon} size={19} color={TILE_TONE[tile.tone].fg} />
                  </View>
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  <Text style={styles.tileSub}>{tile.sub}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.chipRow}>
              {(isOwner ? OWNER_CHIPS : EMPLOYEE_CHIPS).map(chip => (
                <Pressable
                  key={chip}
                  style={styles.chip}
                  onPress={() => send(chip)}
                  disabled={asking}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {openingThread ? (
          <ActivityIndicator color={colors.secondary} />
        ) : (
          messages.map(message =>
            message.role === 'user' ? (
              <View key={message.id} style={styles.userRow}>
                <View style={styles.userCol}>
                  {message.attachments?.length ? (
                    <View style={styles.userAttachRow}>
                      {message.attachments.map((a, i, all) => (
                        <Pressable
                          key={a.path}
                          onPress={() => previewFiles(all, i)}
                        >
                          <Image
                            source={{ uri: a.previewUri }}
                            style={styles.userAttachImg}
                          />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  {message.text ? (
                    <View style={styles.userBubble}>
                      <Text style={styles.userText}>{message.text}</Text>
                    </View>
                  ) : null}
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
                      onOpen={openCreated}
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
        attachments={pending}
        onAttach={attach}
        onRemoveAttachment={removeAttachment}
        onPreviewAttachment={previewPending}
      />

      <FilePreview {...preview.props} />

      <AskHistoryDrawer
        visible={drawerOpen}
        conversations={history}
        activeId={conversationId}
        onOpen={openThread}
        onNewChat={newChat}
        onClose={() => setDrawerOpen(false)}
        onEndReached={loadMoreHistory}
        loadingMore={historyLoadingMore}
      />
    </KeyboardAvoidingView>
  );
};

export default AskTraydScreen;
