import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackActions, createNavigationContainerRef } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AboutScreen } from '@/screens/about/AboutScreen';
import { AddTransactionScreen } from '@/screens/add/AddTransactionScreen';
import { BillsScreen } from '@/screens/bills/BillsScreen';
import { CategoryManagerScreen } from '@/screens/category/CategoryManagerScreen';
import { ExportScreen } from '@/screens/export/ExportScreen';
import { FamilyCreateScreen } from '@/screens/family/FamilyCreateScreen';
import { FamilyDetailScreen } from '@/screens/family/FamilyDetailScreen';
import { FamilyHubScreen } from '@/screens/family/FamilyHubScreen';
import { FamilyJoinScreen } from '@/screens/family/FamilyJoinScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ImportScreen } from '@/screens/import/ImportScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { StatsScreen } from '@/screens/stats/StatsScreen';
import { TABBAR_HEIGHT, colors } from '@/theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

/** 根导航引用：供 TabBar 中央按钮等脱离组件树上下文的场景使用 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabIconRoute = 'Home' | 'Bills' | 'Stats' | 'Profile';

const TAB_ICONS: Record<TabIconRoute, { name: IoniconName; label: string }> = {
  Home: { name: 'home', label: '首页' },
  Bills: { name: 'list', label: '账单' },
  Stats: { name: 'bar-chart', label: '统计' },
  Profile: { name: 'person', label: '我的' },
};

const AddTabPlaceholder = () => null;

const renderTabIcon = (routeName: TabIconRoute, color: string, focused: boolean) => (
  <Ionicons name={TAB_ICONS[routeName].name} size={22} color={focused ? colors.primary : color} />
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { fontSize: 11 },
      tabBarStyle: { height: TABBAR_HEIGHT, paddingTop: 6 },
      ...(route.name in TAB_ICONS
        ? {
            tabBarLabel: TAB_ICONS[route.name as TabIconRoute].label,
            tabBarIcon: ({ color, focused }) =>
              renderTabIcon(route.name as TabIconRoute, color, focused),
          }
        : {}),
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Bills" component={BillsScreen} />
    <Tab.Screen
      name="AddTab"
      component={AddTabPlaceholder}
      listeners={() => ({
        tabPress: (event) => {
          event.preventDefault();
          navigationRef.dispatch(StackActions.push('AddTransaction'));
        },
      })}
      options={{
        tabBarLabel: '',
        tabBarIcon: () => (
          <View style={styles.addButton}>
            <Ionicons name="add" size={26} color={colors.white} />
          </View>
        ),
      }}
    />
    <Tab.Screen name="Stats" component={StatsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const AuthNavigator = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Login" component={LoginScreen} />
    <RootStack.Screen name="Register" component={RegisterScreen} />
  </RootStack.Navigator>
);

export const MainNavigator = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Tabs" component={TabNavigator} />
    <RootStack.Screen
      name="AddTransaction"
      component={AddTransactionScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <RootStack.Screen name="CategoryManager" component={CategoryManagerScreen} />
    <RootStack.Screen name="Export" component={ExportScreen} />
    <RootStack.Screen name="Import" component={ImportScreen} />
    <RootStack.Screen name="FamilyHub" component={FamilyHubScreen} />
    <RootStack.Screen name="FamilyCreate" component={FamilyCreateScreen} />
    <RootStack.Screen name="FamilyJoin" component={FamilyJoinScreen} />
    <RootStack.Screen name="FamilyDetail" component={FamilyDetailScreen} />
    <RootStack.Screen name="Settings" component={SettingsScreen} />
    <RootStack.Screen name="About" component={AboutScreen} />
  </RootStack.Navigator>
);

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
});
