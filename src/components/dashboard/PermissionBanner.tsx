import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { useTheme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';
import { makeDashboardBodyStyles } from '@/styles/dashboard.styles';
import { PERMISSION_LABEL, type PermissionKind } from '@/utils/permissions';
import { usePermissionStatus } from '@/utils/usePermissionStatus';

/** What the user actually loses — more use than naming the permission. */
const IMPACT: Record<PermissionKind, string> = {
  location: "your hours won't log themselves on site",
  camera: "you can't photograph site work or receipts",
  photos: "you can't attach saved photos to a job",
  notifications: "you won't hear about new jobs or messages",
};

export const PermissionBanner = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeDashboardBodyStyles);
  const { missing, fix } = usePermissionStatus();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || missing.length === 0) return null;

  const [first] = missing;
  const single = missing.length === 1;
  const title = single
    ? `${PERMISSION_LABEL[first]} is off`
    : `${missing.length} permissions are off`;
  const body = single
    ? `Without it, ${IMPACT[first]}.`
    : missing.map(k => PERMISSION_LABEL[k]).join(', ');

  return (
    <Pressable style={styles.permCard} onPress={() => fix(first)}>
      <View style={styles.permIcon}>
        <Ionicons name="warning-outline" size={20} color={colors.warning} />
      </View>
      <View style={styles.permBody}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permText} numberOfLines={2}>
          {body} · Tap to fix
        </Text>
      </View>
      <Pressable
        onPress={() => setDismissed(true)}
        hitSlop={10}
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
};

export default PermissionBanner;
