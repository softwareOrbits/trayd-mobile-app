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

export type AskAnswer = {
  conversationId: string | null;
  answer: string;
  blocks: AskBlock[];
};

export type AskMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  blocks: AskBlock[];
};

export type AskConversation = {
  id: string;
  title: string;
  updatedAt: string;
};
