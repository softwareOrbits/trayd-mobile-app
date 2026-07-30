import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { fetchMyVan, fetchOwnerFirstName } from '@/services/fleet';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import type { MainStackParamList, Vehicle } from '@/types';

export const VanIssuePromo = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [van, setVan] = useState<Vehicle | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyVan()
      .then(v => active && setVan(v))
      .catch(() => {});
    fetchOwnerFirstName()
      .then(name => active && setOwnerName(name))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const owner = ownerName ?? 'the office';

  const onReport = () => {
    if (van) {
      navigation.navigate('ReportVanIssue', { vehicleId: van.id });
    } else {
      navigation.navigate('Tabs', { screen: 'Fleet' });
    }
  };

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
              {`Report it now — straight to ${owner} & the van's log`}
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
