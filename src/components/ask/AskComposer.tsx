import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';

export const AskComposer = ({
  onSend,
  disabled = false,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText('');
    onSend(trimmed);
  };

  return (
    <View
      style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Ask about your hours, jobs…"
          placeholderTextColor={colors.placeholder}
          multiline
          onSubmitEditing={submit}
          returnKeyType="send"
          blurOnSubmit
        />

        <Pressable
          style={[styles.composerSend, disabled && styles.composerSendOff]}
          onPress={submit}
          disabled={disabled}
          hitSlop={6}
        >
          <Ionicons name="send" size={17} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
};

export default AskComposer;
