import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';

import { AskTraydFab, InfoCard, useBottomNavHeight } from '@/components/ui';
import { VanLogPanel } from '@/components/fleet/VanLogPanel';
import { fetchMyVan, fetchOwnerFirstName, fetchVanLog } from '@/services/fleet';
import { getMyMemberRef } from '@/services/member';
import { useAppSelector } from '@/store/hooks';
import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { useCollapsibleOnScroll } from '@/utils/useCollapsibleOnScroll';
import { toastError } from '@/utils/toast';
import { makeFleetStyles } from '@/styles/fleet.styles';
import type { MainStackParamList, VanLog, Vehicle } from '@/types';

const FleetScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeFleetStyles);
  const insets = useSafeAreaInsets();
  const navHeight = useBottomNavHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { collapsed, onScroll } = useCollapsibleOnScroll();
  const isOwner = useAppSelector(s => s.auth.isOwner);

  const [loading, setLoading] = useState(true);
  const [van, setVan] = useState<Vehicle | null>(null);
  const [log, setLog] = useState<VanLog | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const [vehicle, owner, me] = await Promise.all([
            fetchMyVan(),
            fetchOwnerFirstName().catch(() => null),
            getMyMemberRef().catch(() => null),
          ]);
          if (!active) return;
          setVan(vehicle);
          setOwnerName(owner);
          setMyMemberId(me?.id ?? null);
          if (vehicle) {
            const vanLog = await fetchVanLog(vehicle.id);
            if (active) setLog(vanLog);
          } else {
            setLog(null);
          }
        } catch (e) {
          if (active) toastError(e, 'Could not load your van.');
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const owner = ownerName ?? 'the office';

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      <Text style={styles.headerEyebrow}>
        {van ? 'FLEET · VAN LOG' : 'FLEET'}
      </Text>
      <Text style={styles.headerTitle}>
        {van ? van.registration : 'Your van'}
      </Text>
      {van ? (
        <Text style={styles.headerSub}>
          {[[van.make, van.model].filter(Boolean).join(' ') || null, 'your van']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.loading}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      </View>
    );
  }

  if (!van || !log) {
    return (
      <View style={styles.flex}>
        {header}
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.emptyWrap,
            { paddingBottom: navHeight + 24 },
          ]}
        >
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bus-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No van assigned yet</Text>
            <Text style={styles.emptyText}>
              {`Once ${owner} assigns you a van, you'll see its NCT, tax and service status here — and be able to report any issue straight from your phone.`}
            </Text>
          </View>
          <InfoCard
            icon="bus-outline"
            title="Driving a shared van today?"
            description={`Ask ${owner} to assign it to you so you can log checks and report issues against it.`}
          />
        </ScrollView>
        <AskTraydFab collapsed={collapsed} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {header}
      <VanLogPanel
        log={log}
        ownerName={ownerName}
        myMemberId={myMemberId}
        canManageSchedule={isOwner}
        bottomPadding={navHeight + 24}
        onReport={() =>
          navigation.navigate('ReportVanIssue', { vehicleId: van.id })
        }
        onOpenTask={taskId => navigation.navigate('TaskDetail', { taskId })}
        onAddScheduleItem={() =>
          navigation.navigate('AddServiceSchedule', {
            vehicleId: van.id,
            registration: van.registration,
          })
        }
        onScroll={onScroll}
      />
      <AskTraydFab collapsed={collapsed} />
    </View>
  );
};

export default FleetScreen;
