import { supabase } from './supabase';
import { isOnline } from '@/offline/connectivity';
import type {
  AskAnswer,
  AskBlock,
  AskConversation,
  AskMessage,
} from '@/types';

const FUNCTION_NAME = 'ask-trayd-agent';

const OFFLINE_ANSWER =
  'You’re offline — Ask Trayd needs a connection to look anything up.';
const GENERIC_ANSWER = 'Something went wrong. Please try again.';

const ERROR_ANSWER: Record<string, string> = {
  not_authenticated: 'Please sign in again to ask about your work.',
  missing_query: 'Ask me a question and I’ll dig it out.',
};

type AgentResponse = {
  conversation_id?: string;
  answer?: string;
  blocks?: AskBlock[];
  error?: string;
};

/**
 * One endpoint answers every question — the Edge Function decides what to read,
 * scopes it by RLS and saves both turns, so the app only sends the question and
 * the thread id it was handed back.
 */
export async function askTrayd(
  query: string,
  conversationId: string | null,
): Promise<AskAnswer> {
  if (!isOnline()) {
    return { conversationId, answer: OFFLINE_ANSWER, blocks: [] };
  }

  const { data, error } = await supabase.functions.invoke<AgentResponse>(
    FUNCTION_NAME,
    { body: { query, conversation_id: conversationId } },
  );

  if (error || !data) {
    return { conversationId, answer: GENERIC_ANSWER, blocks: [] };
  }
  if (data.error) {
    return {
      conversationId,
      answer: ERROR_ANSWER[data.error] ?? GENERIC_ANSWER,
      blocks: [],
    };
  }

  return {
    conversationId: data.conversation_id ?? conversationId,
    answer: data.answer ?? GENERIC_ANSWER,
    blocks: data.blocks ?? [],
  };
}

/** History is read-only on the client — the Edge Function writes every turn. */
export async function fetchAskConversations(): Promise<AskConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (
    (data ?? []) as { id: string; title: string | null; updated_at: string }[]
  ).map(r => ({
    id: r.id,
    title: r.title?.trim() || 'Untitled chat',
    updatedAt: r.updated_at,
  }));
}

export async function fetchAskMessages(
  conversationId: string,
): Promise<AskMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('role, content, data')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw new Error(error.message);

  return (
    (data ?? []) as {
      role: AskMessage['role'];
      content: string | null;
      data: { blocks?: AskBlock[] } | null;
    }[]
  ).map((r, i) => ({
    id: `${conversationId}-${i}`,
    role: r.role,
    text: r.content ?? '',
    blocks: r.data?.blocks ?? [],
  }));
}
