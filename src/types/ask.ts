export type AskAccent = 'danger' | 'warn';

export type AskItem = {
  title: string;
  subtitle?: string;
  amount?: string;
  accent?: AskAccent;
};

export type AskListBlock = {
  type: 'list';
  header: string;
  total?: string;
  items: AskItem[];
};

export type AskTableBlock = {
  type: 'table';
  header?: string;
  total?: string;
  columns: string[];
  rows: (string | null)[][];
  accents?: (AskAccent | null)[];
};

export type AskBlock = AskListBlock | AskTableBlock;

export type AskProposalDetail = {
  label: string;
  value: string;
};

export type AskFieldWidget = 'text' | 'date' | 'number' | 'toggle' | 'select';

export type AskFieldSource =
  | 'customers'
  | 'employees'
  | 'team'
  | 'leave_types'
  | 'roles';

export type AskField = {
  key: string;
  label: string;
  value: unknown;
  required: boolean;
  widget: AskFieldWidget;
  options?: string[];
  source?: AskFieldSource;
};

export type AskUploadRef = {
  path: string;
  media_type?: string;
};

export type AskAttachment = AskUploadRef & {
  name: string;
  previewUri?: string;
};

export type AskProposal = {
  op: string;
  entity: string;
  summary: string;
  params: Record<string, unknown>;
  details: AskProposalDetail[];
  fields?: AskField[];
  attachments?: AskUploadRef[];
  input?: Record<string, unknown>;
};

export type AskCommitResult = {
  ok: boolean;
  message: string;
  id?: string;
  entity?: string;
  attached?: number;
};

export type AskAnswer = {
  conversationId: string | null;
  answer: string;
  blocks: AskBlock[];
  proposal?: AskProposal | null;
};

export type AskMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  blocks: AskBlock[];
  proposal?: AskProposal | null;
  attachments?: AskAttachment[];
};

export type AskConversation = {
  id: string;
  title: string;
  updatedAt: string;
};
