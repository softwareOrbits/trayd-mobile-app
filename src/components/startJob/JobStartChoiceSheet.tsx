import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RadioCard } from '@/components/wizard';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeJobDetailStyles } from '@/styles/jobDetail.styles';
import type { JobStartIntent } from '@/types';

type Props = {
  visible: boolean;
  onPick: (intent: JobStartIntent) => void;
  onClose: () => void;
};

const JobStartChoiceSheet = ({ visible, onPick, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeJobDetailStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.modalTitle}>New job</Text>
          <RadioCard
            icon="play"
            title="Start job"
            subtitle="Set it up and start the clock now."
            selected={false}
            onPress={() => onPick('start')}
          />
          <RadioCard
            icon="calendar-outline"
            title="Plan job"
            subtitle="Set it up and schedule it in your calendar."
            selected={false}
            onPress={() => onPick('plan')}
          />
        </View>
      </View>
    </Modal>
  );
};

export default JobStartChoiceSheet;
