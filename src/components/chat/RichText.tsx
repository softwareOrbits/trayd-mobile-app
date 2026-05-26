import { Text } from 'react-native';
import type { RichTextProps } from '@/types';

const SEGMENT = /(\*\*[^*]+\*\*)/g;

export const RichText = ({ text, style, boldStyle }: RichTextProps) => (
  <Text style={style}>
    {text
      .split(SEGMENT)
      .filter(Boolean)
      .map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={index} style={boldStyle}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
  </Text>
);

export default RichText;
