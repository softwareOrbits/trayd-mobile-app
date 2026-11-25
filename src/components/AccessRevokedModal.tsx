import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import type { Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type Props = { text: string; actionLabel: string; onAction: () => void };

const AccessRevokedModal = ({ text, actionLabel, onAction }: Props) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.shade}>
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.title}>Permission revoked</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.text}>{text}</Text>
            <Button label={actionLabel} fullWidth onPress={onAction} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    shade: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(14,26,45,0.55)',
    },
    card: {
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
    },
    head: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.colors.secondary,
    },
    title: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.bold,
      color: theme.colors.onSecondary,
    },
    body: { padding: 16, gap: 18 },
    text: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.fonts.regular,
      color: theme.colors.text,
    },
  });

export default AccessRevokedModal;
