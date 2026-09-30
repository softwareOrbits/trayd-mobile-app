import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeAskTraydStyles } from '@/styles/askTrayd.styles';

export type ComposerAttachment = {
  id: string;
  name: string;
  mediaType: string;
  previewUri?: string;
  status: 'uploading' | 'ready' | 'failed';
};

export const AskComposer = ({
  onSend,
  value,
  onChangeText,
  disabled = false,
  attachments = [],
  onAttach,
  onRemoveAttachment,
  onPreviewAttachment,
}: {
  onSend: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  attachments?: ComposerAttachment[];
  onAttach?: () => void;
  onRemoveAttachment?: (id: string) => void;
  onPreviewAttachment?: (id: string) => void;
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeAskTraydStyles);
  const insets = useSafeAreaInsets();
  const [internal, setInternal] = useState('');
  const text = value ?? internal;
  const setText = (next: string) => {
    if (onChangeText) onChangeText(next);
    else setInternal(next);
  };

  const uploading = attachments.some(a => a.status === 'uploading');
  const hasReady = attachments.some(a => a.status === 'ready');
  const canSend = !disabled && !uploading && (!!text.trim() || hasReady);

  const submit = () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setText('');
    onSend(trimmed);
  };

  return (
    <View
      style={[styles.composerBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {attachments.length ? (
        <View style={styles.attachRow}>
          {attachments.map(a => (
            <Pressable
              key={a.id}
              style={[
                styles.attachChip,
                a.status === 'failed' && styles.attachChipFailed,
              ]}
              onPress={() => onPreviewAttachment?.(a.id)}
              disabled={!onPreviewAttachment || a.status !== 'ready'}
            >
              <View style={styles.attachThumb}>
                {a.status === 'uploading' ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : a.previewUri ? (
                  <Image source={{ uri: a.previewUri }} style={styles.attachThumbImg} />
                ) : (
                  <Ionicons
                    name="image-outline"
                    size={18}
                    color={colors.secondary}
                  />
                )}
              </View>
              <Text style={styles.attachName} numberOfLines={1}>
                {a.status === 'failed' ? 'Upload failed' : a.name}
              </Text>
              {onRemoveAttachment ? (
                <Pressable
                  onPress={() => onRemoveAttachment(a.id)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.composer}>
        {onAttach ? (
          <Pressable
            style={styles.composerAttach}
            onPress={onAttach}
            disabled={disabled}
            hitSlop={6}
          >
            <Ionicons name="add" size={24} color={colors.secondary} />
          </Pressable>
        ) : null}

        <TextInput
          style={styles.composerInput}
          value={text}
          onChangeText={setText}
          placeholder="Ask Trayd…"
          placeholderTextColor={colors.placeholder}
          multiline
          onSubmitEditing={submit}
          returnKeyType="send"
          blurOnSubmit
        />

        <Pressable
          style={[styles.composerSend, !canSend && styles.composerSendOff]}
          onPress={submit}
          disabled={!canSend}
          hitSlop={6}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? colors.onPrimary : '#A8AEB8'}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default AskComposer;
