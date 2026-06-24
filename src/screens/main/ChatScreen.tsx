import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '@/components/ui';
import { ChatBubble, ChatInputBar } from '@/components/chat';
import { LiveStateBadge } from '@/components/jobs';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { liveMetaFor } from '@/utils/liveMeta';
import { demoChat } from '@/data/chatMessages';
import { makeChatStyles } from '@/styles/chat.styles';
import type { ChatMessage, MainStackParamList } from '@/types';

const ChatScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeChatStyles);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'JobChat'>>();
  const job = useAppSelector(state =>
    state.jobs.items.find(j => j.id === params.jobId),
  );
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(demoChat);

  const elapsed = useMemo(() => liveMetaFor(params.jobId).elapsed, [
    params.jobId,
  ]);
  const paused = job?.status === 'paused';

  const onSend = (text: string) => {
    setMessages(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'I can only help with this job. Try logging a receipt or van stock.',
      },
    ]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd());
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.secondary} />
        </Pressable>

        <Avatar name={job?.customerName ?? 'J'} size={38} style={styles.avatar} />

        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {job?.customerName ?? 'Job chat'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            <Text style={styles.timer}>{elapsed}</Text>
            {job?.customerAddress ? `  ·  ${job.customerAddress}` : ''}
          </Text>
        </View>

        {job?.status === 'active' || paused ? (
          <LiveStateBadge state={paused ? 'paused' : 'active'} />
        ) : null}

        <Pressable style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        <Text style={styles.startedNote}>
          STARTED {elapsed.slice(0, 5)} · DAY 2 OF MULTI-DAY
        </Text>
        {messages.map(message => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      <ChatInputBar onSend={onSend} />
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;
