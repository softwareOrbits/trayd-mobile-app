export type ChatRole = 'assistant' | 'user';

export type ChatLineItem = {
  label: string;
  amount: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  caption?: string;
  action?: string;
  items?: ChatLineItem[];
};

export type ChatBubbleProps = {
  message: ChatMessage;
  onAction?: () => void;
};

export type ChatInputBarProps = {
  onSend: (text: string) => void;
};

export type RichTextProps = {
  text: string;
  style?: import('react-native').StyleProp<import('react-native').TextStyle>;
  boldStyle?: import('react-native').StyleProp<
    import('react-native').TextStyle
  >;
};
