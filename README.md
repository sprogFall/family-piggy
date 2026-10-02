# family-piggy

<div align="center">

**个人 / 家庭账本 · 多人共同记账 · Supabase 实时同步**

一个基于 **React Native（Expo）+ TypeScript + Supabase** 的家庭记账 App：支持个人账本与家庭账本，创建或加入家庭后可与家人共同记账，流水通过 Realtime 实时同步。

[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%7C%20Postgres%20%7C%20Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Jest](https://img.shields.io/badge/Test-Jest%20%2B%20RNTL-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Platforms](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-4EAA25)](#)

</div>

<p align="center">
  <a href="#overview">项目简介</a> ·
  <a href="#highlights">核心亮点</a> ·
  <a href="#feature-matrix">功能矩阵</a> ·
  <a href="#architecture">架构总览</a> ·
  <a href="#quick-start">快速开始</a> ·
  <a href="#development">开发流程</a> ·
  <a href="#testing">测试与质量</a> ·
  <a href="#build-release">构建与发布</a> ·
  <a href="#documents">相关文档</a>
</p>

<a id="overview"></a>
## 项目简介

`family-piggy` 是一个面向家庭场景的记账 App。它既可以是个人账本，也可以变成家庭共享账本：创建家庭后生成邀请码，家人凭邀请码加入即可在同一本账本里一起记账，新增和修改通过 Supabase Realtime 实时同步。

当前 `main` 已具备的主要能力：

- 邮箱注册 / 登录，注册后自动创建用户资料、个人账本与默认分类；
- 个人账本 + 家庭账本自由切换，按账号记住上次打开的账本；
- 完整的「记一笔」体验：金额表达式、币种、日期、分类、多标签、备注、报销标记与账单图片；可选择「定时记账」按月 / 周自动生成流水；
- 账单按天 / 月分组汇总，支持筛选、搜索、下拉刷新、预览、编辑与左滑删除；
- 多周期统计（本月、本周、本年、最近 30 天等快捷周期，也可按周 / 月 / 年 / 自定义日期查询）、收支趋势柱状/曲线、分类分布与金额排行、家庭账本成员筛选、按账本月度预算；
- Excel / CSV 导入导出、记录人映射、多标签解析与系统分享；
- 深色模式三档、全局字体大小四档、头像与昵称等个性化能力；
- GitHub Release 应用内检查、镜像下载回退、SHA-256 校验与拉起安装器。

UI 以根目录 [`记账原型.png`](./记账原型.png) 为设计原型，设计令牌统一收敛在 `src/theme`。

<a id="highlights"></a>
## 核心亮点

- **多账本 + 家庭协作**：个人账本与家庭账本共用一整套记帐能力，邀请码加入，家庭成员头像、昵称与记录人标注完整。
- **实时同步**：Supabase Realtime 按账本过滤订阅，家庭账本的写入会自动补入其他成员页面。
- **数据安全**：Supabase RLS 行级安全策略，家庭数据以 `family_members` 为权限边界；连接信息只通过环境变量注入。
- **金额计算严谨**：金额一律以整数「分」存储与计算，多币种汇总只统计当月主币种，绝不跨币种相加。
- **TDD 工程化**：Jest 全量离线测试，`typecheck + jest` 作为 CI 门禁，核心分层逻辑均有测试覆盖。
- **不依赖 Expo / EAS 账号**：GitHub Actions 上通过 `expo prebuild + Gradle` 直接构建、签名并发布 APK。
- **应用内更新**：无需应用商店，检查 GitHub Release → 镜像回退下载 → SHA-256 分块校验 → 拉起系统安装器。
- **双主题 + 字号**：浅色 / 深色两套调色板与四档全局字号，设置本地持久化、即时生效。

<a id="feature-matrix"></a>
## 功能矩阵

| 模块 | 状态 | 当前能力 |
| --- | --- | --- |
| 账号与多账本 | ✅ | 邮箱注册 / 登录；注册自动创建资料、个人账本与默认分类；个人账本 / 家庭账本切换；按账号记住上次打开的账本 |
| 记一笔 | ✅ | 顶部币种 + 大号金额 + 日期；支出 / 收入切换；分类九宫格；多标签；备注；记账类型（报销）；最多 3 张账单图片；金额表达式实时计算 |
| 定时记账 | ✅ | 记一笔时选择「定时记账」，通过双列滚轮按每月几号或每周周几创建规则；规则本身不计入流水，由 Supabase Cron 每小时检查并到期生成真实流水；「我的 → 定时记账」可管理、编辑、删除规则 |
| 账单管理 | ✅ | 按天分组、日小计、月汇总；收入 / 支出 / 记录人筛选；分类 / 标签关键词搜索；下拉刷新；预览、编辑、删除与左滑操作 |
| 多币种 | ✅ | 每笔流水独立币种（CNY / USD / EUR / JPY / HKD / GBP）；汇总 / 统计 / 趋势只统计当月主币种，有其他币种时提示未计入笔数 |
| 统计与预算 | ✅ | 支持本月、本周、本年、最近 30 天等快捷周期，也可按周 / 月 / 年或自定义日期区间查询；家庭账本可按成员筛选；收支趋势支持支出 / 收入 / 结余 / 收支切换与柱状 / 曲线切换；分类分布支持支出 / 收入 / 收支三种口径，展示金额、占比与笔数；底部保留金额排行并分页加载，可点击查看详情；按账本设置月度预算与超支提醒 |
| 分类与标签 | ✅ | 分类增删改、图标选择、拖拽排序（草稿保存 + 未保存退出确认）；标签隶属于分类、可多选复用，流水保存标签名快照，删除标签不影响历史账单 |
| 家庭协作 | ✅ | 创建 / 改名家庭、邀请码加入、成员头像与成员管理、退出 / 解散；家庭账本全员可记账，账单展示记录人昵称 |
| 导入 / 导出 | ✅ | 导入 Excel / CSV：目标账本选择、来源记录人映射、前 20 条确认预览、标签自动创建；导出当月 `.xlsx` / `.csv` 并系统分享 |
| 个性化 | ✅ | 深色模式三档（跟随系统 / 浅色 / 深色）、全局字体大小四档（小 / 标准 / 大 / 超大）、头像上传与昵称修改 |
| 应用内更新 | ✅ | 检查 GitHub Release（仅正式版）→ 镜像回退下载 → SHA-256 分块校验 → 拉起系统安装器；支持忽略指定版本 |
| 手机号验证码登录 | ⛔ 规划 | 需要接入 Supabase SMS Provider |
| iOS 正式包 | ⛔ 规划 | 当前 CI 只产出 Android APK，AAB / TestFlight 流水线待补 |

<a id="architecture"></a>
## 架构总览

### 分层与依赖方向

```text
screens ──► stores ──► services ──► lib/supabase
   │           │           │
   └───────────┴───────────┴──► domain（纯函数，可被所有层复用）
                                types / theme（无依赖的类型与设计令牌）
```

| 层 | 职责 |
| --- | --- |
| `src/domain/` | 金额、日期、统计、图表几何、CSV、校验等纯函数；零外部业务依赖 |
| `src/services/` | Supabase 数据访问与行类型映射；唯一允许直接调用 Supabase 的业务层 |
| `src/stores/` | zustand 状态、缓存桶、loading / error 与 service 编排 |
| `src/screens/` | 页面交互、焦点加载、导航编排；禁止直连 Supabase |
| `src/components/` | 通用 UI、基础组件与图表；通用组件 props 驱动，全局组件可只读 store，禁止直接访问 Supabase |
| `src/navigation/` | 路由定义与参数类型 |
| `src/theme/` | 浅色 / 深色调色板、间距、字号、图标映射、`makeStyles` / `useColors` |
| `src/types/` | 领域类型、DB 行类型与 GitHub Release 行类型映射 |
| `src/lib/` | Supabase client、跨平台弹窗、错误文案等底层工具 |
| `src/hooks/` | 跨 store 派生 hooks 与页面复用逻辑 |

### 系统结构

```text
family-piggy
├─ src/
│  ├─ domain/        纯函数业务逻辑 + 测试
│  ├─ services/      Supabase 数据访问 + 测试
│  ├─ stores/        zustand 全局状态 + 测试
│  ├─ components/    通用组件、基础 UI、图表
│  ├─ screens/       页面
│  ├─ navigation/    路由注册与参数类型
│  ├─ theme/         调色板、字号、深色模式、图标映射
│  ├─ types/         领域模型与数据库行类型
│  ├─ lib/           supabase client / alert / errors
│  ├─ hooks/         跨 store 派生 hooks
│  └─ test/          测试替身
├─ assets/           应用图标与开屏资源
├─ supabase/         schema.sql + migrations/
├─ docs/             项目手册
├─ .github/          CI / 缓存预热 / Release 工作流
└─ App.tsx           应用根编排
```

更完整的现状、数据流与模块说明见 [`docs/项目手册.md`](./docs/项目手册.md)。

<a id="tech-stack"></a>
## 技术栈

| 类别 | 选型 | 说明 |
| --- | --- | --- |
| 语言 | TypeScript `~5.3.3` | `strict: true`，禁止 `any` |
| 客户端 | Expo `~52.0.46` + React Native `0.76.9` + React `18.3.1` | Expo 托管工作流，函数组件 + Hooks |
| 状态管理 | zustand `^5.0.3` | 9 个业务 store，无 Redux / 业务 Context |
| 后端 | Supabase | Auth + Postgres + RLS + Realtime + Storage |
| 路由 | @react-navigation `^7` | native / native-stack / bottom-tabs |
| 图表 | react-native-svg `15.8.0` | 折线、环形等图表自绘 |
| 表格 | xlsx `^0.18.5` | Excel 导入 / 导出 |
| 本地存储 | @react-native-async-storage `1.23.1` | Supabase 会话、字号、深色模式持久化 |
| 测试 | Jest `^29.7.0` + jest-expo `~52.0.6` + RNTL `^12.9.0` | 离线、确定性、秒级 |
| 构建发布 | GitHub Actions + Gradle | 不依赖 Expo / EAS 账号 |

> Expo 生态包一律使用 `npx expo install <包名>` 安装，版本范围由 SDK 决定；禁止手写 `^` 范围，避免原生模块版本漂移。

<a id="quick-start"></a>
## 快速开始

### 1. 配置 Supabase

1. 在 [supabase.com](https://supabase.com) 创建项目。
2. 打开 Dashboard → SQL Editor，整体执行 [`supabase/schema.sql`](./supabase/schema.sql)。该脚本是幂等的，可重复执行，包含表结构、索引、函数、触发器、RLS 策略、Realtime publication 与 Storage 桶。
3. 复制环境变量模板并填写项目 URL 与 Anon Key：

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> `.env` 已被 `.gitignore` 忽略，仓库中不会出现真实连接信息；`.env.example` 是唯一提交模板。

若数据库是旧版本初始化的，按文件名顺序执行 `supabase/migrations/`：

| 迁移 | 作用 |
| --- | --- |
| `20260928080631_tags_and_ledger_select_fix.sql` | 历史备注迁移为标签，修复 `ledgers` SELECT 策略导致的创建失败问题 |
| `20260928220000_tag_category_and_tx_currency.sql` | 标签改为按分类归属，流水增加币种 |
| `20260929090000_transaction_note_types_images.sql` | 独立备注、JSONB 记账类型、账单图片与 `transaction-images` 桶 |
| `20260930090000_import_recorder_mapping.sql` | 导入记录人映射所需的 RLS 辅助函数与 INSERT 策略 |
| `20260930100000_transaction_multi_tags.sql` | 单标签升级为多标签数组，并回填历史数据 |
| `20260930110000_family_management.sql` | 家庭改名与重新生成邀请码 RPC |
| `20260930120000_transaction_tag_names.sql` | 流水标签由关联改为 `tag_names text[]` 快照，删除标签不影响历史账单 |
| `20261001090000_recurring_rules.sql` | 新增定时记账规则表、流水防重约束与 Supabase Cron 调度 |

`schema.sql` 会创建 8 张核心表：`profiles`、`families`、`family_members`、`ledgers`、`categories`、`tags`、`transactions`、`recurring_rules`，并处理注册自动建档、新账本默认分类播种、邀请码加入、Realtime 发布与 Storage 策略。定时记账还需要 Supabase Cron 每小时调用 `public.generate_due_recurring_transactions()`。

> 定时记账依赖 `pg_cron`。`schema.sql` / 迁移会尝试自动启用并创建每小时任务；如果当前项目没有权限，请在 Supabase Dashboard → Database → Extensions 启用 `pg_cron` 后手动执行：
>
> ```sql
> select cron.schedule(
>   'generate-recurring-transactions',
>   '0 * * * *',
>   $$select public.generate_due_recurring_transactions();$$
> );
> ```

### 2. 启动应用

```bash
npm install
npm start        # Expo Dev Server，使用 Expo Go 扫码运行
```

也可以直接启动对应平台：

```bash
npm run android
npm run ios
```

<a id="development"></a>
## 开发流程

开发前请先阅读 [`AGENTS.md`](./AGENTS.md)，其中包含强制开发规范、分层架构、测试规范与提交前检查清单。

推荐流程：

```text
读规范 / 相关代码 → 写失败测试（红）→ 最小实现（绿）→ 重构（蓝）
  → npm run typecheck → npm test -- --ci → commit
```

日常命令：

```bash
npm start                    # Expo Dev Server
npm run typecheck            # tsc --noEmit
npm test -- --ci             # 全量 Jest
npm run test:watch           # TDD 监听模式
npx expo install --check     # 校验 Expo 依赖版本对齐
```

硬性约定：

- `src/domain/`、`src/services/`、`src/stores/` 的新增 / 修改逻辑必须有对应测试；
- 页面禁止直连 Supabase，必须经过 `services` / `stores`；
- 金额一律以整数「分」存储与计算；
- UI 颜色、间距、字号统一走 `src/theme`；
- 删除 / 确认等提示统一使用 `showAlert`，禁止直接调用原生 `Alert`；
- 提交信息使用 `feat / fix / refactor / test / docs / chore` 前缀，一次提交一个完整意图。

<a id="testing"></a>
## 测试与质量

测试体系基于 **Jest + jest-expo + React Native Testing Library**，通过 `jest.setup.ts` 全局 mock 原生模块与网络，保证所有测试离线、确定、快速运行。

- 测试文件与被测文件同目录：`foo.ts` → `foo.test.ts`；
- `domain` 测纯逻辑与边界值；`services` 测请求参数与字段映射；`stores` 测状态迁移与 selector 稳定性；组件测交互行为而非像素快照；
- Supabase 查询链使用 `src/test/supabase-mock.ts` 的 `createQueryChain` / `queryError`，Realtime 使用 `createRealtimeChannel`；
- bug 修复先补失败用例，再修复并保留回归测试。

CI 工作流：

| 工作流 | 触发 | 内容 |
| --- | --- | --- |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | push / PR 到 `main` | `npm ci` → `npm run typecheck` → `npm test -- --ci` |
| [`.github/workflows/warm-android-cache.yml`](./.github/workflows/warm-android-cache.yml) | 依赖 / 配置变更或手动触发 | 在 `main` 作用域预热 Gradle 缓存 |
| [`.github/workflows/release.yml`](./.github/workflows/release.yml) | 推送 `v*` 标签或手动触发 | 构建、签名并发布 Android APK |

<a id="database-security"></a>
## 数据库与安全

- 所有表启用 **RLS**；家庭共享数据以 `family_members` 为权限边界。
- `transactions` 加入 `supabase_realtime` publication，按 `ledger_id` 过滤订阅。
- `supabase/schema.sql` 为幂等全量脚本；新表 / 新字段必须新增 migration，并同步 schema 与中文注释。
- `profiles.avatar_url` 与账单图片分别使用 `avatars` / `transaction-images` Storage 桶。
- Supabase 连接信息通过 `EXPO_PUBLIC_*` 注入；`EXPO_PUBLIC_*` 会被内联进客户端 bundle，属公开信息，**真正需要保密的是 keystore 与其密码**。
- 新增环境变量必须同步更新 [`.env.example`](./.env.example) 与本文档。

<a id="build-release"></a>
## 构建与发布

Android APK 完全在 GitHub Actions Runner 上构建，**不依赖 Expo / EAS 账号**：CI 内先 `expo prebuild` 生成原生工程，再用 Gradle 打包并签名。JDK 17 与 Android SDK 由 Runner 自带。

### 触发方式与产物

```bash
# 正式发布：推送 annotated tag
git tag -a v0.1.32 -m "v0.1.32：一句话主题

- 用户可感知的改动"
git push origin v0.1.32
```

| 触发方式 | 发布标签 | 说明 |
| --- | --- | --- |
| 推送 `v*` 标签 | 该标签（如 `v0.1.32`） | 正式 Release |
| 手动 Run workflow | `build-<run_number>` | 预发布，便于随时获取安装包 |

产物发布在仓库 **Releases** 页面的 Assets 中，文件名形如 `family-piggy-<tag>.apk`，可直接点击下载安装，无需解压。同一标签重跑会覆盖同名资产。

### 环境变量与版本号注入链路

```text
GitHub Secrets
  └─ EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
       └─ Gradle assembleRelease 触发 Metro 打包时内联进 bundle

github.run_number → ANDROID_VERSION_CODE → app.config.js 的 android.versionCode（每次构建递增）
tag v0.1.32       → APP_VERSION          → app.config.js 的 version（去掉 v 前缀）
```

<details>
<summary><strong>首次打包一次性准备：keystore + GitHub Secrets</strong></summary>

1. **生成签名 keystore**（本机执行一次，务必自行备份；丢失后无法覆盖升级已安装的 App）：

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias family-piggy \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. **将 keystore 转为 Base64（单行）**：

```bash
# macOS / Linux
base64 -w0 release.keystore

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))
```

keystore 已被 `.gitignore` 忽略（`*.keystore` / `*.jks`），不要提交。

3. **在 GitHub 仓库 Settings → Secrets and variables → Actions 配置 5 个 Secrets**：

| Secret | 说明 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase Anon Key |
| `ANDROID_KEYSTORE_BASE64` | keystore 的 Base64 单行文本 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码（PKCS12 下 key 密码与其相同） |
| `ANDROID_KEY_ALIAS` | keystore 别名（示例为 `family-piggy`） |

4. **应用图标与原生开屏**：`app.config.js` 已配置 `icon`、`android.adaptiveIcon` 与 `expo-splash-screen`。替换图标时直接覆盖 `assets/icon.png` 与 `assets/adaptive-icon.png`（保持 1024×1024），无需改代码；原生开屏需要重新构建才生效。`app.config.test.js` 会校验图标尺寸、白边、安全区与开屏配置。

</details>

<details>
<summary><strong>构建失败排查</strong></summary>

| 现象 | 原因与处理 |
| --- | --- |
| `Plugin [id: 'expo-module-gradle-plugin'] was not found` | `node_modules` 混入其他 SDK 版本的原生模块；运行 `npx expo install --check`，再用 `npx expo install <包名>` 装回期望版本 |
| `Could not get unknown property 'release' for SoftwareComponent container` | 通常是上一条版本错配的连带报错，依赖对齐后消失 |
| APK 仍是 debug 签名 | keystore Secrets 未生效，检查 `ANDROID_KEYSTORE_BASE64` / 密码 / 别名 |
| 发布构建卡在下载 `gradle-*-all.zip` | 到 Actions 手动触发一次 **Warm Android Cache**，或 push `package.json` / `package-lock.json` 预热 main 缓存 |

</details>

> 发布工作流需要 `contents: write` 权限来创建 Release（已在 `release.yml` 中声明）。若仓库或组织策略将默认 `GITHUB_TOKEN` 限制为只读，请到 Settings → Actions → General → Workflow permissions 调整为 “Read and write permissions”。

<a id="in-app-update"></a>
## 应用内更新

Android 端「关于我们」页会自动检查新版本，并支持应用内下载与安装：

- **检查**：匿名调用 GitHub Releases API 获取最新**正式**版本（草稿与预发布不会推给用户），再与当前 `version` 做语义化版本比较；
- **下载**：按「Release 说明中的 `APK-Mirror` → `gh-proxy.com` 镜像 → GitHub 直连」顺序回退，展示下载进度；
- **校验**：按资产大小 + Release 说明中的 `SHA256` 行做完整性校验，使用纯 JS 4MB 分块哈希，避免一次性读入大包；
- **安装**：校验通过后拉起系统安装器；Android 8+ 首次需在手机上允许本应用「安装未知应用」；
- **忽略版本**：点击「忽略此版本」后不再提示，随时可重新查看。

> ⚠️ 该能力要求仓库保持**公开**：私有仓库匿名访问 GitHub API 与 Release 资产会 404，此时卡片会优雅提示「暂时无法获取更新信息」而非报错。
> `SHA256` 行由 `release.yml` 发布时自动写入 Release 说明；若配置了镜像，可在说明中追加 `APK-Mirror: https://...`，App 端无需发版即可生效。

<a id="documents"></a>
## 相关文档

- [开发与测试规范 AGENTS.md](./AGENTS.md)
- [项目手册：现状、数据流与模块说明](./docs/项目手册.md)
- [环境变量模板 .env.example](./.env.example)
- [数据库全量脚本 supabase/schema.sql](./supabase/schema.sql)
- [CI 工作流 .github/workflows/ci.yml](./.github/workflows/ci.yml)
- [Release 工作流 .github/workflows/release.yml](./.github/workflows/release.yml)

<a id="roadmap"></a>
## 路线图

- 手机号 + 短信验证码登录（需 Supabase SMS Provider）；
- iOS 正式包（AAB / TestFlight）发布流水线；
- 持续清理 [`docs/项目手册.md`](./docs/项目手册.md) 中记录的技术债与已知问题。

<a id="repo"></a>
## 仓库地址

- GitHub: [https://github.com/sprogFall/family-piggy](https://github.com/sprogFall/family-piggy)
