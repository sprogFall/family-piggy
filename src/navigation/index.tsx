import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StackActions, createNavigationContainerRef } from '@react-navigation/native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps, ComponentType } from 'react';
import { View } from 'react-native';

import { useFontScaleSubscription } from '@/stores/settings.store';

import { AboutScreen } from '@/screens/about/AboutScreen';
import { AddTransactionScreen } from '@/screens/add/AddTransactionScreen';
import { BillsScreen } from '@/screens/bills/BillsScreen';
import { CategoryManagerScreen } from '@/screens/category/CategoryManagerScreen';
import { BudgetScreen } from '@/screens/budget/BudgetScreen';
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
import { createStyles, colors, fontSize, scaleFontSize, TABBAR_HEIGHT } from '@/theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * 屏幕包装：订阅「设置 → 字体大小」档位。
 *
 * 样式里的 fontSize / lineHeight 由 theme.createStyles 以 getter 形式按当前档位计算，
 * 因此只要屏幕重渲染，字号即刻生效，无需重建导航或重启应用。
 * 包装组件必须在模块作用域创建一次，避免每次 render 生成新组件导致屏幕重挂载。
 */
const withFontScale = <P extends object>(Screen: ComponentType<P>): ComponentType<P> => {
  const FontScaleAwareScreen = (props: P) => {
    useFontScaleSubscription();
    return <Screen {...props} />;
  };
  FontScaleAwareScreen.displayName = `withFontScale(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return FontScaleAwareScreen;
};

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

/**
 * 简化 Tab 点击反馈：React Navigation 默认使用 Android 无边界水波纹
 * （borderless: true），水波纹会溢出按钮范围并与相邻 Tab 相互重叠；
 * 这里改为受限（borderless: false）的浅色水波纹，只在本按钮内扩散。
 */
const TabBarButton = (props: BottomTabBarButtonProps) => (
  <PlatformPressable
    {...props}
    android_ripple={{ color: colors.ripple, borderless: false }}
  />
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: { fontSize: scaleFontSize(fontSize.xs) },
      tabBarStyle: { height: TABBAR_HEIGHT, paddingTop: 6 },
      tabBarButton: TabBarButton,
      ...(route.name in TAB_ICONS
        ? {
            tabBarLabel: TAB_ICONS[route.name as TabIconRoute].label,
            tabBarIcon: ({ color, focused }) =>
              renderTabIcon(route.name as TabIconRoute, color, focused),
          }
        : {}),
    })}
  >
    <Tab.Screen name="Home" component={HomeTab} />
    <Tab.Screen name="Bills" component={BillsTab} />
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
    <Tab.Screen name="Stats" component={StatsTab} />
    <Tab.Screen name="Profile" component={ProfileTab} />
  </Tab.Navigator>
);

const HomeTab = withFontScale(HomeScreen);
const BillsTab = withFontScale(BillsScreen);
const StatsTab = withFontScale(StatsScreen);
const ProfileTab = withFontScale(ProfileScreen);
const Tabs = withFontScale(TabNavigator);
const AddTransaction = withFontScale(AddTransactionScreen);
const CategoryManager = withFontScale(CategoryManagerScreen);
const Budget = withFontScale(BudgetScreen);
const Export = withFontScale(ExportScreen);
const Import = withFontScale(ImportScreen);
const FamilyHub = withFontScale(FamilyHubScreen);
const FamilyCreate = withFontScale(FamilyCreateScreen);
const FamilyJoin = withFontScale(FamilyJoinScreen);
const FamilyDetail = withFontScale(FamilyDetailScreen);
const Settings = withFontScale(SettingsScreen);
const About = withFontScale(AboutScreen);
const Login = withFontScale(LoginScreen);
const Register = withFontScale(RegisterScreen);

export const AuthNavigator = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Login" component={Login} />
    <RootStack.Screen name="Register" component={Register} />
  </RootStack.Navigator>
);

export const MainNavigator = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Tabs" component={Tabs} />
    <RootStack.Screen
      name="AddTransaction"
      component={AddTransaction}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <RootStack.Screen name="CategoryManager" component={CategoryManager} />
    <RootStack.Screen name="Budget" component={Budget} />
    <RootStack.Screen name="Export" component={Export} />
    <RootStack.Screen name="Import" component={Import} />
    <RootStack.Screen name="FamilyHub" component={FamilyHub} />
    <RootStack.Screen name="FamilyCreate" component={FamilyCreate} />
    <RootStack.Screen name="FamilyJoin" component={FamilyJoin} />
    <RootStack.Screen name="FamilyDetail" component={FamilyDetail} />
    <RootStack.Screen name="Settings" component={Settings} />
    <RootStack.Screen name="About" component={About} />
  </RootStack.Navigator>
);

const styles = createStyles({
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
