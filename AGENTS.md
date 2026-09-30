# AGENTS.md — family-piggy 项目协作规范

> 本文件约束所有 AI 与人类协作者在本仓库中的开发行为。**开始任何改动前，必须先阅读并遵守本文件。**

## 1. 项目概述

家庭记账 App（family-piggy）：
- 支持多种账本：**个人账本**、**家庭账本**
- 支持**单人记账 / 多人共同记账**
- 基于 **Supabase**（Auth + Postgres + RLS + Realtime）实现在线同步与实时协作
- 支持创建家庭、通过邀请码加入家庭，在家庭账本中共同记账
- UI 遵循根目录 `记账原型.png`

## 2. 技术栈（不得随意更换）

- 语言：**TypeScript（strict 模式）**，禁止 `any`（确需逃逸时必须注释原因）
- 框架：**React + React Native（Expo 托管工作流）**，仅使用函数组件 + Hooks，禁止 class 组件
- 状态管理：zustand
- 后端：Supabase（Auth / Postgres / RLS / Realtime）
- 测试：Jest + React Native Testing Library
- 图表：react-native-svg 自绘（不引入重型图表库）
- 路由：@react-navigation
- 依赖管理：Expo 生态包一律用 `npx expo install <包名>` 安装（版本由 SDK 决定，写入 `~` 精确范围），禁止手写 `^` 范围，避免原生模块版本漂移到其他 SDK；CI 会执行 `npx expo install --check` 作为门禁

## 3. 核心开发原则

### 3.1 TDD 测试驱动开发（强制）
- 严格遵循 红（先写失败测试）→ 绿（最小实现）→ 蓝（重构）循环
- `src/domain`、`src/services`、`src/stores` 中的所有逻辑必须有对应 `*.test.ts(x)` 覆盖
- 提交前 `npm test` 与 `npm run typecheck` 必须全部通过

### 3.2 彻底改造原则（强制）
- 需求变更时**整体重构相关模块**，禁止打补丁、禁止保留旧实现做兼容、禁止注释掉的死代码
- 改完即删：旧代码、旧类型、旧测试同步删除，仓库中永远只保留一种实现

### 3.3 代码整洁
- 单一职责；单文件建议 ≤ 300 行，超出必须拆分
- 命名清晰自释；禁止魔法数字/魔法字符串，统一收敛到 `theme`、`types` 或常量文件
- 禁止在组件/页面中直接调用 Supabase，必须经 `services` 层
- **金额一律以“分”（整数 cents）存储与计算**，仅展示层格式化为元
- UI 颜色、间距、字号统一走 `src/theme`，禁止散落硬编码样式值；颜色只能在**组件内**用 `makeStyles((colors) => ...)` / `useColors()` 读取（禁止在模块作用域取色），新增颜色令牌必须同时补齐浅色 / 深色两套调色板

### 3.4 弹窗与确认框规范（强制）

- 禁止业务代码直接调用 React Native `Alert.alert`、浏览器 `window.alert` / `window.confirm`。
- 所有提示 / 确认统一使用 `src/lib/alert.ts` 的 `showAlert`，由根组件 `DialogHost` 渲染 App 风格弹窗。
- 确认类操作按钮语义：
  - `{ text: '取消', style: 'cancel' }`：取消；
  - `{ text: '删除' / '退出' / '解散', style: 'destructive' }`：危险操作；
  - 普通确认使用 `style: 'default'`。
- 简单提示不传 `buttons` 时自动显示「好的」按钮。
- 新增确认弹窗时禁止再写平台判断或原生 `Alert`，保证 Android / iOS / Web 样式一致。

## 4. 分层架构（依赖方向不可违反）

```
src/
  domain/      纯函数业务逻辑（金额、日期、统计、图表几何、导入导出解析），零外部依赖
  services/    Supabase 数据访问（auth / profile / ledger / category / transaction / family / export / import）
  stores/      zustand 全局状态，编排 services
  components/  通用 UI 组件与图表
  screens/     页面（按功能分组）
  navigation/  路由定义与类型
  theme/       设计令牌（浅色 / 深色调色板、间距、字号、图标映射）与 makeStyles / useColors 样式工厂
  types/       领域类型与数据库行类型映射
  lib/         supabase client、通用工具
```

依赖方向：`screens → stores → services → lib`；`domain` 可被所有层复用，但其自身不得依赖其他任何层。

## 5. 测试规范

- 测试文件与被测文件同目录：`foo.ts` → `foo.test.ts`
- 优先测试纯函数与状态逻辑；组件测试聚焦交互行为而非像素快照
- 网络一律 mock（`@/lib/supabase`），测试必须离线可跑、秒级完成

## 6. Supabase 约定

- `supabase/schema.sql` 为**幂等初始化脚本**（可重复执行），包含双层中文注释：列定义行内 `--` 注释（便于阅读文件）+ `COMMENT ON` 元数据注释（便于数据库工具查看）
- 新表必须启用 RLS 并编写策略，家庭共享数据以 `family_members` 为权限边界
- 需要实时同步的表须加入 `supabase_realtime` publication

## 7. 提交与环境变量规范

### 7.1 发布 tag 说明规范（强制）

- 发布必须使用 annotated tag：`git tag -a vX.Y.Z -m "..."`，禁止 lightweight tag。
- tag 说明会由 Release workflow 写入 GitHub Release 正文，并直接展示在 App「关于我们 → 应用更新」中，因此必须写**面向用户的简洁更新内容**。
- 格式约定：

```text
vX.Y.Z：一句话主题

- 用户可感知的改动 1
- 用户可感知的改动 2
```

- 内容要求：
  - 只写用户能感知到的变化，例如「支持多标签」「修复分类拖拽」；
  - 不要写代码、数据库迁移、RLS、测试、构建等实现细节；
  - 建议 3-6 行，每行尽量不超过 30 个字；
  - 不要出现 `SHA256`、`APK` 等机器字段；workflow 会自动追加校验行。
- 示例：

```text
v0.1.27：账单排行与更新说明优化

- 统计排行可点击查看账单详情
- 排行展示标签
- 关于我们展示版本更新内容
```

- 提交信息使用 `feat / fix / refactor / test / docs / chore` 前缀，一次提交一个完整意图
- **禁止提交任何真实密钥 / 连接信息**：Supabase 连接信息一律通过 `EXPO_PUBLIC_*` 环境变量注入
  - 本地：`.env`（参考 `.env.example`，`.env` 已被 gitignore，不入库）
  - CI 打包：GitHub Secrets（`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS`）直接注入构建环境；APK 由 GitHub Actions 内 `expo prebuild + gradle` 构建并签名，不依赖 Expo / EAS 账号
  - `app.config.js` 只做环境变量读取，不承载真实值；`src/lib/supabase.ts` 直接读取 `process.env.EXPO_PUBLIC_*`
- 新增环境变量时必须同步更新 `.env.example` 与 README 的 Secrets 表
