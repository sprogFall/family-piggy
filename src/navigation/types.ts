import type { NavigatorScreenParams } from '@react-navigation/native';

import type { CurrencyCode } from '@/domain/currency';

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
  /**
   * 传 transactionId 进入账单编辑；recurringRuleId 进入定时记账编辑；
   * startRecurring 直接打开定时选择；initialDate 用于「再记一笔」保持日期一致。
   */
  AddTransaction:
    | {
        transactionId?: string;
        recurringRuleId?: string;
        startRecurring?: boolean;
        initialDate?: string;
      }
    | undefined;
  /** 账单预览：删除 / 修改入口 */
  TransactionPreview: { transactionId: string };
  /** 统计页分类下钻：在统计时的周期 / 成员 / 币种条件下查看该分类明细 */
  CategoryTransactions: {
    categoryId: string;
    categoryName: string;
    periodKey: string;
    periodLabel: string;
    start: string;
    end: string;
    currency: CurrencyCode;
    memberId?: string | null;
  };
  CategoryManager: undefined;
  LedgerManager: undefined;
  RecurringRuleManager: undefined;
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
