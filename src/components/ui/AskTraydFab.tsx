import { type StyleProp, type ViewStyle } from 'react-native';
import Toast from 'react-native-toast-message';
import FloatingActionButton from './FloatingActionButton';
import { useBottomNavHeight } from './BottomNav';

type AskTraydFabProps = {
  collapsed?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const AskTraydFab = ({ collapsed, style }: AskTraydFabProps) => {
  const navHeight = useBottomNavHeight();

  return (
    <FloatingActionButton
      label="Ask Trayd"
      icon="sparkles"
      tone="secondary"
      collapsed={collapsed}
      onPress={() =>
        Toast.show({ type: 'info', text1: 'Ask Trayd', text2: 'Coming soon' })
      }
      style={[{ bottom: navHeight + 16 }, style]}
    />
  );
};

export default AskTraydFab;
