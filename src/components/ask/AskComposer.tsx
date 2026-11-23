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
import { useDictation } from '@/utils/useDictation';

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
  onFocusChange,
  keyboardOpen = false,
}: {
  onSend: (text: string) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  disabled?: boolean;
  attachments?: ComposerAttachment[];
  onAttach?: () => void;
  onRemoveAttachment?: (id: string) => void;
  onPreviewAttachment?: (id: string) => void;
  onFocusChange?: (focused: boolean) => void;
  keyboardOpen?: boolean;
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

  const dictation = useDictation(text, setText);

  const submit = () => {
    if (!canSend) return;
    dictation.reset();
    const trimmed = text.trim();
    setText('');
    onSend(trimmed);
  };

  return (
    <View
      style={[
        styles.composerBar,
        keyboardOpen
          ? styles.composerBarKeyboard
          : { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
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
          // Multiline inputs on iOS keep their grown height after the value is
          // cleared programmatically (on send); pin the height while empty.
          style={[styles.composerInput, !text && styles.composerInputEmpty]}
          value={text}
          onChangeText={next => {
            dictation.sync(next);
            setText(next);
          }}
          onPressIn={() => onFocusChange?.(true)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder={dictation.listening ? 'Listening…' : 'Ask Trayd…'}
          placeholderTextColor={colors.placeholder}
          multiline
          onSubmitEditing={submit}
          returnKeyType="send"
          blurOnSubmit
        />

        <Pressable
          style={[styles.composerMic, dictation.listening && styles.composerMicOn]}
          onPress={dictation.toggle}
          disabled={disabled || dictation.starting}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={dictation.listening ? 'Stop dictation' : 'Dictate'}
        >
          {dictation.starting ? (
            <ActivityIndicator size="small" color={colors.secondary} />
          ) : (
            <Ionicons
              name={dictation.listening ? 'stop' : 'mic-outline'}
              size={dictation.listening ? 16 : 22}
              color={dictation.listening ? colors.onSecondary : colors.secondary}
            />
          )}
        </Pressable>

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
