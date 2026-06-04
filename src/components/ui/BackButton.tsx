import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';

import { useTheme, type Theme } from '@/theme';
import { useThemedStyles } from '@/utils/useThemedStyles';

type BackButtonProps = {
  onPress?: () => void;
  absolute?: boolean;
  style?: ViewStyle;
};

export const BackButton = ({ onPress, absolute, style }: BackButtonProps) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.row,
        { paddingTop: insets.top + 8 },
        absolute ? styles.absolute : null,
        style,
      ]}
    >
      <Pressable style={styles.iconBtn} onPress={handlePress} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.secondary} />
      </Pressable>
    </View>
  );
};

export const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    row: { paddingHorizontal: 16, paddingBottom: 4 },
    absolute: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -8,
    },
  });

export default BackButton;
