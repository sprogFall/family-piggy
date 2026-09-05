# family-piggy 家庭记账

支持**个人账本 / 家庭账本**的记账 App：单人记账、创建或加入家庭后与家人**多人共同记账**，基于 Supabase 实现账号体系、云端存储与**实时同步**。UI 遵循 `记账原型.png`。

## 技术栈

- React Native（Expo 托管工作流）+ TypeScript（strict）
- React 函数组件 + Hooks，zustand 状态管理
- Supabase：Auth / Postgres + RLS / Realtime
- react-native-svg 自绘图表（趋势折线 / 占比环形）
- 测试：Jest + React Native Testing Library（TDD，全部离线可跑）

## 快速开始

### 1. 配置 Supabase

1. 在 [supabase.com](https://supabase.com) 创建项目；
2. 打开 Dashboard → SQL Editor，整体执行 `supabase/schema.sql`（可重复执行）；
3. 复制 `.env.example` 为 `.env`，填入项目 URL 与 Anon Key：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
EAS_PROJECT_ID=            # 执行 npx eas-cli init 后回填
```

> Supabase 信息一律通过 `EXPO_PUBLIC_*` 环境变量注入（由 `app.config.js` 与 `src/lib/supabase.ts` 读取），**仓库中不提交任何真实连接信息**；`.env` 已被 `.gitignore` 忽略，仅提交 `.env.example` 模板。

数据库脚本包含：用户资料/家庭/家庭成员/账本/分类/流水六张表、RLS 行级安全策略、注册自动建档（资料 + 个人账本 + 默认分类）、新账本自动播种默认分类、邀请码生成与 `join_family` RPC、流水表 Realtime 发布、账本月度预算列、头像存储桶与策略。

### 2. 启动

```bash
npm install
npm start        # Expo Dev Server，用 Expo Go 扫码即可运行
```

## CI / 自动打包（GitHub Actions）

仓库内置两条工作流：

- `.github/workflows/ci.yml`：push / PR 到 main 时执行 `typecheck + jest` 质量门禁；
- `.github/workflows/release.yml`：推送 `v*` 标签或手动触发时，EAS 云打包 Android **APK**，产物自动上传到 Actions Artifacts（`app-release-apk`），发布正式版可在 `eas.json` 的 `production` profile 上扩展（AAB）。

需要在 GitHub 仓库 **Settings → Secrets and variables → Actions** 配置 4 个 Secrets：

| Secret | 说明 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase Anon Key |
| `EXPO_TOKEN` | Expo 账号 Access Token（expo.dev → Account Settings → Access Tokens） |
| `EAS_PROJECT_ID` | 运行 `npx eas-cli init` 后获得的 项目 ID |

打包前工作流会把 Supabase 信息注入 EAS 项目 secrets（`eas secret:push`），云构建时作为环境变量进入 bundle。

发布新版本：

```bash
git tag v0.1.1 && git push origin v0.1.1
```

## 常用命令

```bash
npm test          # 运行全部测试（Jest）
npm run test:watch
npm run typecheck # tsc --noEmit
```

## 功能清单

- 邮箱注册 / 登录（注册即自动创建「个人账本」与默认分类）
- 多账本：个人账本、家庭账本自由切换，可新建个人账本
- 记一笔：支出/收入切换、分类九宫格、备注、日期选择、金额键盘
- 账单列表：按天分组、日小计、月汇总；点击账单可编辑 / 删除
- 月度预算：按账本设置，首页汇总卡展示使用进度与超支提醒
- 首页与统计：月度汇总卡、收支趋势、支出占比环形图、分类构成
- 分类管理：新增 / 编辑 / 删除（支出与收入独立）
- 家庭：创建家庭（自动建家庭账本）、邀请码加入、成员管理、退出 / 解散
- 多人共同记账：家庭账本全员可记账，流水 Realtime 实时同步
- 头像：从相册选择上传至 Supabase Storage，个人资料实时更新
- 导出：当月流水导出 Excel(.xlsx) / CSV，系统分享
- 导入：Excel / CSV 解析预览，缺失分类自动创建后批量入库

## 目录结构

```
src/
  domain/      纯函数业务逻辑（金额、日期、统计、图表几何、CSV）+ 测试
  services/    Supabase 数据访问层 + 测试
  stores/      zustand 状态层 + 测试
  components/  通用 UI 组件与图表
  screens/     页面（auth / home / add / bills / stats / category / family / export / import / profile / settings / about）
  navigation/  路由与类型
  theme/       设计令牌与图标映射
  types/       领域类型与数据库行映射
  lib/         supabase client 与通用工具
supabase/      schema.sql（表结构 / RLS / 触发器 / Realtime）
```

## 开发约定

见 [AGENTS.md](./AGENTS.md)：TDD 强制、TypeScript strict、彻底改造原则（不做补丁）、金额一律以「分」计算、页面禁止直连 Supabase。

## 路线图

- 手机号 + 短信验证码登录（需 Supabase SMS Provider）
- 家庭账本成员记账标注（谁记的）
- iOS 正式包（AAB / TestFlight）发布流水线
