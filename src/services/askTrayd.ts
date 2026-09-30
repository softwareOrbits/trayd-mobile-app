import { supabase } from './supabase';
import { getMyMemberRef } from './member';
import { isOnline } from '@/offline/connectivity';
import { base64ToUint8Array } from '@/utils/base64';
import { uuidv4 } from '@/utils/uuid';
import type {
  AskAnswer,
  AskAttachment,
  AskBlock,
  AskCommitResult,
  AskConversation,
  AskFieldSource,
  AskMessage,
  AskProposal,
  AskUploadRef,
} from '@/types';

const FUNCTION_NAME = 'ask-trayd-agent';
const UPLOAD_BUCKET = 'ask-uploads';

export const ASK_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const ASK_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const OFFLINE_ANSWER =
  'You’re offline — Ask Trayd needs a connection to look anything up.';
const GENERIC_ANSWER = 'Something went wrong. Please try again.';
const OFFLINE_COMMIT =
  'You’re offline — reconnect to save this.';

const ERROR_ANSWER: Record<string, string> = {
  not_authenticated: 'Please sign in again to ask about your work.',
  missing_query: 'Ask me a question and I’ll dig it out.',
  not_a_member: 'You don’t have access to Ask Trayd for this business.',
  ai_limit_reached:
    'You’ve used all your Ask Trayd questions for this month. They reset at the start of next month.',
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
  attached?: number;
  error?: string;
};

async function readErrorBody<T>(error: unknown): Promise<T | null> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (!context?.json) return null;
  try {
    return (await context.json()) as T;
  } catch {
    return null;
  }
}

/**
 * One endpoint answers every question — the Edge Function decides what to read,
 * scopes it by RLS and saves both turns, so the app only sends the question and
 * the thread id it was handed back.
 */
export async function askTrayd(
  query: string,
  conversationId: string | null,
  images: AskUploadRef[] = [],
): Promise<AskAnswer> {
  if (!isOnline()) {
    return { conversationId, answer: OFFLINE_ANSWER, blocks: [] };
  }

  const { data, error } = await supabase.functions.invoke<AgentResponse>(
    FUNCTION_NAME,
    {
      body: {
        query,
        conversation_id: conversationId,
        ...(images.length ? { images } : {}),
      },
    },
  );

  const body = data ?? (error ? await readErrorBody<AgentResponse>(error) : null);

  if (body?.error) {
    return {
      conversationId,
      answer: ERROR_ANSWER[body.error] ?? GENERIC_ANSWER,
      blocks: [],
    };
  }
  if (error || !body) {
    return { conversationId, answer: GENERIC_ANSWER, blocks: [] };
  }

  return {
    conversationId: body.conversation_id ?? conversationId,
    answer: body.answer ?? GENERIC_ANSWER,
    blocks: body.blocks ?? [],
    proposal: body.proposed_action ?? null,
  };
}

const COMMIT_ERROR: Record<string, string> = {
  unknown_action: 'That action is not supported yet.',
  not_a_member: 'You don’t have permission to do that.',
  not_authenticated: 'Please sign in again to do that.',
};

export async function commitAskAction(
  proposal: AskProposal,
  conversationId: string | null,
  input?: Record<string, unknown>,
): Promise<AskCommitResult> {
  if (!isOnline()) {
    return { ok: false, message: OFFLINE_COMMIT };
  }

  const { data, error } = await supabase.functions.invoke<CommitResponse>(
    FUNCTION_NAME,
    {
      body: {
        commit: {
          op: proposal.op,
          ...(input ? { input } : { params: proposal.params }),
          ...(proposal.attachments?.length
            ? { attachments: proposal.attachments }
            : {}),
        },
        conversation_id: conversationId,
      },
    },
  );

  const body = data ?? (error ? await readErrorBody<CommitResponse>(error) : null);

  if (body?.error) {
    return {
      ok: false,
      message:
        body.message ??
        COMMIT_ERROR[body.error] ??
        ERROR_ANSWER[body.error] ??
        GENERIC_ANSWER,
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
    attached: body.attached ?? 0,
  };
}

const extensionFor = (mediaType: string, name: string): string => {
  const fromName = name.includes('.')
    ? (name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
  if (fromName) return fromName;
  return (mediaType.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
};

export async function uploadAskFile(file: {
  base64: string;
  mediaType: string;
  name: string;
  previewUri?: string;
}): Promise<AskAttachment> {
  const { businessId } = await getMyMemberRef();
  const path = `${businessId}/${uuidv4()}.${extensionFor(file.mediaType, file.name)}`;
  const { error } = await supabase.storage
    .from(UPLOAD_BUCKET)
    .upload(path, base64ToUint8Array(file.base64), {
      contentType: file.mediaType,
      upsert: false,
    });
  if (error) throw new Error(error.message);
  return {
    path,
    media_type: file.mediaType,
    name: file.name,
    previewUri: file.previewUri,
  };
}

export function removeAskFile(path: string): void {
  supabase.storage
    .from(UPLOAD_BUCKET)
    .remove([path])
    .catch(() => {});
}

const optionCache = new Map<AskFieldSource, string[]>();

const optionQuery = (source: AskFieldSource) => {
  switch (source) {
    case 'customers':
      return supabase.from('customers').select('name').order('name');
    case 'employees':
      return supabase
        .from('business_members')
        .select('name:full_name')
        .eq('is_employee', true)
        .eq('invite_status', 'active')
        .order('full_name');
    case 'team':
      return supabase
        .from('business_members')
        .select('name:full_name')
        .eq('invite_status', 'active')
        .order('full_name');
    case 'leave_types':
      return supabase.from('leave_types').select('name').order('sort_order');
    case 'roles':
      return supabase.from('job_roles').select('name').order('name');
  }
};

export async function fetchAskFieldOptions(
  source: AskFieldSource,
): Promise<string[]> {
  const cached = optionCache.get(source);
  if (cached) return cached;
  const { data, error } = await optionQuery(source);
  if (error) throw new Error(error.message);
  const names = Array.from(
    new Set(
      ((data ?? []) as { name: string | null }[])
        .map(r => (r.name ?? '').trim())
        .filter(Boolean),
    ),
  );
  optionCache.set(source, names);
  return names;
}

export function clearAskFieldOptions(): void {
  optionCache.clear();
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
