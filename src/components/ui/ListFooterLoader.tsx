import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

export const ListFooterLoader = ({ visible }: { visible: boolean }) => {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.secondary} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingVertical: 18, alignItems: 'center' },
});

export default ListFooterLoader;
