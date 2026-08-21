import { type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FloatingActionButton from './FloatingActionButton';
import { useBottomNavHeight } from './BottomNav';
import type { MainStackParamList } from '@/types';

type AskTraydFabProps = {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AskTraydFab = ({ collapsed, style }: AskTraydFabProps) => {
  const navHeight = useBottomNavHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <FloatingActionButton
      label="Ask Trayd"
      icon="sparkles"
      tone="secondary"
      collapsed={collapsed}
      onPress={() => navigation.navigate('AskTrayd')}
      style={[{ bottom: navHeight + 16 }, style]}
    />
  );
};

export default AskTraydFab;
