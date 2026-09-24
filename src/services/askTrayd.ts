import { supabase } from './supabase';
import { isOnline } from '@/offline/connectivity';
import type {
  AskAnswer,
  AskBlock,
  AskCommitResult,
  AskConversation,
  AskMessage,
  AskProposal,
} from '@/types';

const FUNCTION_NAME = 'ask-trayd-agent';

const OFFLINE_ANSWER =
  'You’re offline — Ask Trayd needs a connection to look anything up.';
const GENERIC_ANSWER = 'Something went wrong. Please try again.';
const OFFLINE_COMMIT =
  'You’re offline — reconnect to save this.';

const ERROR_ANSWER: Record<string, string> = {
  not_authenticated: 'Please sign in again to ask about your work.',
  missing_query: 'Ask me a question and I’ll dig it out.',
};

type AgentResponse = {
  conversation_id?: string;
  answer?: string;
  blocks?: AskBlock[];
  proposed_action?: AskProposal;
  error?: string;
};

type CommitResponse = {
  committed?: { op?: string; entity?: string; id?: string };
  message?: string;
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
    proposal: data.proposed_action ?? null,
  };
}

const COMMIT_ERROR: Record<string, string> = {
  unknown_action: 'That action is not supported yet.',
  not_a_member: 'You don’t have permission to do that.',
  not_authenticated: 'Please sign in again to do that.',
};

async function readErrorBody(error: unknown): Promise<CommitResponse | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (!context?.json) return null;
  try {
    return (await context.json()) as CommitResponse;
  } catch {
    return null;
  }
}

export async function commitAskAction(
  proposal: AskProposal,
  conversationId: string | null,
): Promise<AskCommitResult> {
  if (!isOnline()) {
    return { ok: false, message: OFFLINE_COMMIT };
  }

  const { data, error } = await supabase.functions.invoke<CommitResponse>(
    FUNCTION_NAME,
    {
      body: {
        commit: { op: proposal.op, params: proposal.params },
        conversation_id: conversationId,
      },
    },
  );

  const body = data ?? (error ? await readErrorBody(error) : null);

  if (body?.error) {
    return {
      ok: false,
      message: body.message ?? COMMIT_ERROR[body.error] ?? GENERIC_ANSWER,
    };
  }
  if (error || !body) {
    return { ok: false, message: GENERIC_ANSWER };
  }

  return {
    ok: true,
    message: body.message ?? 'Done.',
    id: body.committed?.id,
    entity: body.committed?.entity,
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
