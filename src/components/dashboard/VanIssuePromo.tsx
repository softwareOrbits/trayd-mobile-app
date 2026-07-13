import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';

export const VanIssuePromo = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);

  const onReport = () =>
    Toast.show({
      type: 'info',
      text1: 'Report a van issue',
      text2: 'Coming soon',
    });

  return (
    <View style={styles.section}>
      <View style={styles.vanCard}>
        <View style={styles.vanTop}>
          <View style={styles.vanIcon}>
            <Ionicons name="bus-outline" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.vanTitle}>Spotted something on the van?</Text>
            <Text style={styles.vanSub}>
              Report it now — straight to Síle & the van's log
            </Text>
          </View>
        </View>
        <Pressable style={styles.vanBtn} onPress={onReport}>
          <Ionicons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.vanBtnText}>Report a van issue</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default VanIssuePromo;
