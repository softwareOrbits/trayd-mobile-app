import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import type { ChatBubbleProps } from '@/types';
import AssistantAvatar from './AssistantAvatar';
import RichText from './RichText';

export const ChatBubble = ({ message, onAction }: ChatBubbleProps) => {
  const styles = useThemedStyles(makeStyles);

  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <RichText
            text={message.text}
            style={styles.userText}
            boldStyle={styles.userBold}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <AssistantAvatar />
      <View style={styles.assistantCol}>
        <View style={styles.assistantBubble}>
          <RichText
            text={message.text}
            style={styles.assistantText}
            boldStyle={styles.assistantBold}
          />
          {message.caption ? (
            <Text style={styles.caption}>{message.caption.toUpperCase()}</Text>
          ) : null}
        </View>

        {message.items ? (
          <View style={styles.items}>
            {message.items.map(item => (
              <View key={item.label} style={styles.itemRow}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemAmount}>{item.amount}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {message.action ? (
          <Pressable style={styles.action} onPress={onAction}>
            <Text style={styles.actionText}>{message.action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    userRow: { alignItems: 'flex-end', marginBottom: 14 },
    userBubble: {
      maxWidth: '82%',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.radii.lg,
      borderBottomRightRadius: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    userText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.white,
      lineHeight: 21,
    },
    userBold: { fontFamily: theme.fonts.bold, color: theme.colors.white },

    assistantRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 14,
    },
    assistantCol: { flex: 1, alignItems: 'flex-start', gap: 8 },
    assistantBubble: {
      maxWidth: '92%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      borderTopLeftRadius: 4,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    assistantText: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.text,
      lineHeight: 21,
    },
    assistantBold: { fontFamily: theme.fonts.bold, color: theme.colors.text },
    caption: {
      marginTop: 8,
      fontSize: 10,
      fontFamily: theme.fonts.monoBold,
      letterSpacing: 0.8,
      color: theme.colors.textMuted,
    },
    items: {
      alignSelf: 'stretch',
      maxWidth: '92%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 6,
    },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    itemLabel: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.mono,
      color: theme.colors.text,
    },
    itemAmount: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.monoBold,
      color: theme.colors.text,
    },
    action: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    actionText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.fonts.semibold,
      color: theme.colors.secondary,
    },
  });

export default ChatBubble;
