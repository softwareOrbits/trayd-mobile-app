import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { JobHeader } from '@/components/ui';
import { VanLogPanel } from '@/components/fleet/VanLogPanel';
import { fetchOwnerFirstName, fetchVanLog } from '@/services/fleet';
import { getMyMemberRef } from '@/services/member';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { toastError } from '@/utils/toast';
import { makeFleetStyles } from '@/styles/fleet.styles';
import type { MainStackParamList, VanLog } from '@/types';

const VanLogScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { params } = useRoute<RouteProp<MainStackParamList, 'VanLog'>>();

  const [log, setLog] = useState<VanLog | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        fetchVanLog(params.vehicleId),
        fetchOwnerFirstName().catch(() => null),
        getMyMemberRef().catch(() => null),
      ])
        .then(([vanLog, owner, me]) => {
          if (!active) return;
          setLog(vanLog);
          setOwnerName(owner);
          setMyMemberId(me?.id ?? null);
        })
        .catch(e => active && toastError(e, 'Could not load the van log.'));
      return () => {
        active = false;
      };
    }, [params.vehicleId]),
  );

  return (
    <View style={styles.flex}>
      <JobHeader
        title={log ? log.vehicle.registration : 'Van log'}
        onBack={() => navigation.goBack()}
      />
      {log ? (
        <VanLogPanel
          log={log}
          ownerName={ownerName}
          myMemberId={myMemberId}
          onReport={() =>
            navigation.navigate('ReportVanIssue', {
              vehicleId: params.vehicleId,
            })
          }
          onOpenTask={taskId => navigation.navigate('TaskDetail', { taskId })}
        />
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      )}
    </View>
  );
};

export default VanLogScreen;
