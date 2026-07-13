import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { BottomNav } from '@/components/ui';
import type { MainTabParamList, NavItem } from '@/types';
import DashboardScreen from '@/screens/main/DashboardScreen';
import CalendarScreen from '@/screens/main/CalendarScreen';
import JobsScreen from '@/screens/main/JobsScreen';
import LeaveScreen from '@/screens/main/LeaveScreen';
import FleetScreen from '@/screens/main/FleetScreen';
import NotificationsScreen from '@/screens/main/NotificationsScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';

type TabConfig = NavItem & {
  name: keyof MainTabParamList;
  component: React.ComponentType;
};

const NAV_TABS: TabConfig[] = [
  { name: 'Home', key: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home', component: DashboardScreen },
  { name: 'Calendar', key: 'Calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar', component: CalendarScreen },
  { name: 'Jobs', key: 'Jobs', label: 'Jobs', icon: 'build-outline', activeIcon: 'build', raised: true, component: JobsScreen },
  { name: 'Leave', key: 'Leave', label: 'Leave', icon: 'sunny-outline', activeIcon: 'sunny', component: LeaveScreen },
  { name: 'Fleet', key: 'Fleet', label: 'Fleet', icon: 'bus-outline', activeIcon: 'bus', component: FleetScreen },
];

const HIDDEN_TABS: { name: keyof MainTabParamList; component: React.ComponentType }[] = [
  { name: 'Notifications', component: NotificationsScreen },
  { name: 'Profile', component: ProfileScreen },
];

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const activeKey = state.routes[state.index].name;
  const items: NavItem[] = NAV_TABS.map(({ key, label, icon, activeIcon, badge, raised }) => ({
    key,
    label,
    icon,
    activeIcon,
    badge,
    raised,
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
    initialRouteName="Home"
    screenOptions={{ headerShown: false }}
    tabBar={props => <TabBar {...props} />}
  >
    {NAV_TABS.map(tab => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
    {HIDDEN_TABS.map(tab => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
  </Tab.Navigator>
);

export default MainTabs;
