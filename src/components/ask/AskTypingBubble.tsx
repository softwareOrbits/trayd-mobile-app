import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AssistantAvatar } from '@/components/chat';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';

const PHRASES = [
  'Thinking…',
  'Reading your Trayd data…',
  'Crunching the numbers…',
  'Writing it up…',
  'Almost there…',
];

const STEP_MS = 1600;

/** There is no streaming, so the wait gets a rotating status instead of a dot. */
export const AskTypingBubble = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setStep(s => Math.min(s + 1, PHRASES.length - 1)),
      STEP_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.typingRow}>
      <AssistantAvatar />
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={colors.secondary} />
        <Text style={styles.typingText}>{PHRASES[step]}</Text>
      </View>
    </View>
  );
};

export default AskTypingBubble;
