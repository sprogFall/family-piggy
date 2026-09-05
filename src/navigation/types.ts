import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Bills: undefined;
  Stats: undefined;
  Profile: undefined;
  /** 占位路由：tabBar 中央记账按钮 */
  AddTab: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  /** 传 transactionId 进入编辑模式，否则为记一笔 */
  AddTransaction: { transactionId?: string } | undefined;
  CategoryManager: undefined;
  Budget: undefined;
  Export: undefined;
  Import: undefined;
  FamilyHub: undefined;
  FamilyCreate: undefined;
  FamilyJoin: undefined;
  FamilyDetail: { familyId: string };
  Settings: undefined;
  About: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
