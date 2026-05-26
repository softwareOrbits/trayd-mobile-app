import { Pressable, StyleSheet, Text } from 'react-native';
import { type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type TextLinkProps = { label: string; onPress?: () => void };

export const TextLink = ({ label, onPress }: TextLinkProps) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: { alignSelf: 'center', paddingVertical: 4 },
    text: {
      color: theme.colors.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.semibold,
      textDecorationLine: 'underline',
    },
  });

export default TextLink;
