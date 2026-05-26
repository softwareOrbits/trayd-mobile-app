
import Ionicons from '@react-native-vector-icons/ionicons';
import { StyleProp, TextInputProps, TextStyle, ViewStyle } from 'react-native';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type NavItem = {
    key: string;
    label: string;
    icon: IconName;
    activeIcon?: IconName;
    badge?: number;
};
export type BottomNavProps = {
    items: NavItem[];
    activeKey: string;
    onChange: (key: string) => void;
};
export type ButtonVariant = 'filled' | 'outlined' | 'ghost';
export type ButtonSize = 'lg' | 'md' | 'sm';
export type ButtonColor = 'primary' | 'secondary';

export type ButtonProps = {
    label: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    color?: ButtonColor;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    leftIcon?: IconName;
    rightIcon?: IconName;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export type Step = { label: string };
export type StepperProps = { steps: Step[]; currentStep: number };

export type TabItem = { key: string; label: string; icon?: IconName };
export type TabsProps = {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export type AvatarProps = {
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export type DividerProps = {
  inset?: number;
  style?: StyleProp<ViewStyle>;
};