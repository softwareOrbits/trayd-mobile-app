import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { BottomNav } from '@/components/ui';
import type { MainTabParamList, NavItem } from '@/types';
import JobsScreen from '@/screens/main/JobsScreen';
import NotificationsScreen from '@/screens/main/NotificationsScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';

type TabConfig = NavItem & {
  name: keyof MainTabParamList;
  component: React.ComponentType;
};

const TABS: TabConfig[] = [
  { name: 'Jobs', key: 'Jobs', label: 'Jobs', icon: 'layers-outline', activeIcon: 'layers', component: JobsScreen },
  { name: 'Notifications', key: 'Notifications', label: 'Notifications', icon: 'notifications-outline', activeIcon: 'notifications', component: NotificationsScreen },
  { name: 'Profile', key: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', component: ProfileScreen },
];

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const activeKey = state.routes[state.index].name;
  const items: NavItem[] = TABS.map(({ key, label, icon, activeIcon, badge }) => ({
    key,
    label,
    icon,
    activeIcon,
    badge,
  }));

  return (
    <BottomNav
      activeKey={activeKey}
      items={items}
      onChange={key => navigation.navigate(key as keyof MainTabParamList)}
    />
  );
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={props => <TabBar {...props} />}
  >
    {TABS.map(tab => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
  </Tab.Navigator>
);

export default MainTabs;
