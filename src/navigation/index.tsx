import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackActions, createNavigationContainerRef } from '@react-navigation/native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { AboutScreen } from '@/screens/about/AboutScreen';
import { AddTransactionScreen } from '@/screens/add/AddTransactionScreen';
import { BillsScreen } from '@/screens/bills/BillsScreen';
import { CategoryManagerScreen } from '@/screens/category/CategoryManagerScreen';
import { CategoryTransactionsScreen } from '@/screens/stats/CategoryTransactionsScreen';
import { BudgetScreen } from '@/screens/budget/BudgetScreen';
import { ExportScreen } from '@/screens/export/ExportScreen';
import { FamilyCreateScreen } from '@/screens/family/FamilyCreateScreen';
import { FamilyDetailScreen } from '@/screens/family/FamilyDetailScreen';
import { FamilyHubScreen } from '@/screens/family/FamilyHubScreen';
import { FamilyJoinScreen } from '@/screens/family/FamilyJoinScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ImportScreen } from '@/screens/import/ImportScreen';
import { LedgerManagerScreen } from '@/screens/ledger/LedgerManagerScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { RecurringRuleManagerScreen } from '@/screens/recurring/RecurringRuleManagerScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { StatsScreen } from '@/screens/stats/StatsScreen';
import { TransactionPreviewScreen } from '@/screens/transaction/TransactionPreviewScreen';
import {
  fontSize,
  makeStyles,
  scaleFontSize,
  TABBAR_HEIGHT,
  useColors,
  useFontScale,
} from '@/theme';
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

const renderTabIcon = (
  routeName: TabIconRoute,
  color: string,
  focused: boolean,
  activeColor: string,
) => <Ionicons name={TAB_ICONS[routeName].name} size={22} color={focused ? activeColor : color} />;

/**
 * 简化 Tab 点击反馈：React Navigation 默认使用 Android 无边界水波纹
 * （borderless: true），水波纹会溢出按钮范围并与相邻 Tab 相互重叠；
 * 这里改为受限（borderless: false）的浅色水波纹，只在本按钮内扩散。
 */
const TabBarButton = (props: BottomTabBarButtonProps) => {
  const colors = useColors();
  return (
    <PlatformPressable {...props} android_ripple={{ color: colors.ripple, borderless: false }} />
  );
};

const TabNavigator = () => {
  const colors = useColors();
  const fontScale = useFontScale();
  const styles = useStyles();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // Tab 文案不在 styles 里，需显式按当前字号档位缩放
        tabBarLabelStyle: { fontSize: scaleFontSize(fontSize.xs, fontScale) },
        tabBarStyle: { height: TABBAR_HEIGHT, paddingTop: 6 },
        tabBarButton: TabBarButton,
        ...(route.name in TAB_ICONS
          ? {
              tabBarLabel: TAB_ICONS[route.name as TabIconRoute].label,
              tabBarIcon: ({ color, focused }) =>
                renderTabIcon(route.name as TabIconRoute, color, focused, colors.primary),
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
};

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
    <RootStack.Screen
      name="TransactionPreview"
      component={TransactionPreviewScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <RootStack.Screen
      name="CategoryTransactions"
      component={CategoryTransactionsScreen}
      options={{ animation: 'slide_from_right' }}
    />
    <RootStack.Screen name="CategoryManager" component={CategoryManagerScreen} />
    <RootStack.Screen name="LedgerManager" component={LedgerManagerScreen} />
    <RootStack.Screen name="RecurringRuleManager" component={RecurringRuleManagerScreen} />
    <RootStack.Screen name="Budget" component={BudgetScreen} />
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

const useStyles = makeStyles((colors) => ({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 12,
    width: 52,
  },
}));
