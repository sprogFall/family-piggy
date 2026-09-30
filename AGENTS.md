# AGENTS.md — family-piggy 开发与测试规范

> **给 AI coding agent 的强制约定。**
> 开始改动前，先读本文件；需要了解项目现状、数据流和具体模块时，再读 [`docs/项目手册.md`](./docs/项目手册.md) 与 [`README.md`](./README.md)。
> 本文件只回答一件事：**在这个仓库里，代码应该怎么改。**

---

## 0. AI 工作方式

1. **先读再写**：改动前至少阅读目标文件、同目录测试，以及相关 `types` / `service` / `store`。
2. **一次只做一个完整意图**：不顺手重构无关模块，不保留临时分支、死代码和兼容双轨。
3. **TDD 强制**：先让测试失败（红）→ 最小实现（绿）→ 重构（蓝）。
4. **小步验证**：每完成一个可独立验证的改动，先运行相关测试；提交前必须全量通过。
5. **安全第一**：不提交真实密钥、连接串、keystore、token、用户数据或调试响应转储。
6. **不擅自操作远端**：未得到用户明确要求，不执行 `git push`、不创建 / 修改 tag、不改远端配置。
7. **优先复用**：优先使用 `domain/` 纯函数、`theme` 设计令牌、`components/ui` 基础组件，不重复造轮子。

---

## 1. 技术栈与硬约束

| 方向 | 选型 | 硬性规则 |
| --- | --- | --- |
| 语言 | TypeScript 5.3 + strict | 禁止 `any`；确需逃逸必须注释原因。统一使用 `@/` 别名 |
| 框架 | Expo SDK 52 + React Native 0.76 | 仅函数组件 + Hooks，禁止 class 组件 |
| 状态 | zustand 5 | 全局业务状态统一放 `stores/`，不引 Redux / 业务 Context |
| 后端 | Supabase：Auth / Postgres / RLS / Realtime / Storage | 连接信息只通过 `EXPO_PUBLIC_*` 注入 |
| 路由 | @react-navigation 7 | 路由与参数类型统一在 `navigation/` 定义 |
| 图表 | react-native-svg 自绘 | 不引入重型图表库 |
| 表格 | xlsx | 导入 / 导出统一走 `domain/csv` 与 `services/export`、`services/import` |
| 测试 | Jest + jest-expo + React Native Testing Library | 测试必须离线、确定性、快速 |
| 弹窗 | `src/lib/alert.ts` 的 `showAlert` | 禁止业务代码直接调 `Alert.alert` / `window.alert` |
| 金额 | **整数「分」** | 存储与计算一律用 cents，仅输入 / 展示层转「元」 |
| 主题 | `src/theme` 双调色板 + `makeStyles` / `useColors` | 禁止散落硬编码颜色、间距、字号 |

### 依赖安装

- Expo 生态包必须使用 `npx expo install <包名>`，版本范围由 SDK 决定，不手写 `^`。
- 引入新依赖前先确认是否可用现有库 / 原生能力实现，避免增加体积与升级负担。
- 修改依赖后必须运行 `npx expo install --check`。

---

## 2. 项目基础架构

### 2.1 依赖方向（不可违反）

```text
screens ──► stores ──► services ──► lib/supabase
   │           │           │
   └───────────┴───────────┴──► domain（纯函数，可被所有层复用）
                                types / theme（无依赖的类型与设计令牌）
```

### 2.2 分层职责

| 层 | 职责 | 禁止事项 |
| --- | --- | --- |
| `src/domain/` | 金额、日期、统计、图表几何、CSV、校验等纯函数 | 禁止 import `services` / `stores` / `supabase` / React |
| `src/services/` | Supabase 数据访问，行类型 ↔ 领域类型映射 | 禁止写 UI 状态；禁止在 `services` 之外直接 import `supabase` |
| `src/stores/` | zustand 全局状态，编排 services，维护缓存 / loading / error | 禁止写 SQL；禁止直接调 Supabase；禁止承载复杂业务规则 |
| `src/components/` | 通用 UI、基础组件、图表；通用组件 props 驱动，全局组件可只读 store | 禁止直接 import `supabase`；基础组件不要把数据获取写进渲染逻辑 |
| `src/screens/` | 页面交互、焦点加载、导航编排 | 禁止直连 Supabase；禁止堆砌业务计算，必须下沉到 domain / store |
| `src/navigation/` | 路由注册与参数类型 | 不写业务逻辑 |
| `src/theme/` | 浅色 / 深色调色板、间距、字号、图标映射、样式工厂 | 禁止在组件中硬编码色值与设计 token |
| `src/types/` | 领域类型 + DB 行类型映射 | `types/db.ts` 的 `toXxx()` 是字段命名转换的唯一入口 |
| `src/lib/` | Supabase client、跨平台弹窗、错误文案等底层工具 | 不承载业务状态 |
| `src/hooks/` | 跨 store 派生逻辑与页面复用 hooks | 不替代 store 持久状态 |
| `src/test/` | 测试替身 | 不写业务实现 |

### 2.3 目录地图

```text
src/
  domain/       纯函数业务逻辑 + 测试
  services/     Supabase 数据访问 + 测试
  stores/       zustand 状态 + 测试
  components/   通用组件、基础 UI、图表
  screens/      页面（按功能分目录）
  navigation/   路由注册与参数类型
  theme/        调色板、font-scale、scheme、icons、makeStyles / useColors
  types/        领域模型、DB 行类型、GitHub Release 行类型
  lib/          supabase client、alert、errors
  hooks/        跨 store 派生 hooks
  test/         测试替身（查询链、Realtime channel 等）
assets/         应用图标与开屏资源
supabase/       schema.sql（幂等全量脚本）+ migrations/（增量迁移）
```

### 2.4 新增功能放哪里

| 需求类型 | 放置位置 | 必须同步 |
| --- | --- | --- |
| 纯计算 / 解析 / 校验 | `src/domain/foo.ts` | `foo.test.ts` |
| 新字段 / 新表映射 | `src/types/db.ts` + `src/types/domain.ts` | 相关 service 测试 |
| 新数据访问方法 | 对应 `src/services/xxx.service.ts` | `xxx.service.test.ts` |
| 新全局状态 / 缓存 | 对应 `src/stores/xxx.store.ts` | `xxx.store.test.ts` |
| 新通用 UI | `src/components/` 或 `components/ui/` | 交互测试（如适用） |
| 新页面 | `src/screens/<功能>/XxxScreen.tsx` | `navigation/types.ts` + `navigation/index.tsx` |
| 新设计令牌 | `src/theme/palette.ts` / `index.ts` | 浅色 + 深色两套值 |
| 新数据库变更 | `supabase/migrations/<timestamp>_xxx.sql` | 必要时同步 `schema.sql` |

### 2.5 关键不变量（改坏会引发运行时问题）

- `App.tsx` 是唯一根编排点；`auth.store.initialize()` 必须**先注册会话监听，再读初始 session**。
- 登出时重置 `ledger` / `transaction` / `category` / `tag` 等业务 store，但保留字号与深色模式等设备级设置。
- Realtime channel 的 topic 必须追加递增序号，避免复用到尚未异步移除完成的旧 channel。
- zustand v5 selector 对「未加载 / 空账本」必须返回**模块级常量空数组**，保证快照引用稳定。
- 本端写入后优先本地更新月份桶，不依赖 Realtime 回环；Realtime 只负责补入其他成员的变更。
- 跨月编辑 `occurredAt` 后，相关已加载月份桶必须正确重拉 / 迁移。
- 所有数据库行到领域对象的转换统一走 `types/db.ts`，禁止在页面里手写 `snake_case` 映射。
- 所有提示 / 确认统一走 `showAlert`，由根组件 `DialogHost` 渲染 App 风格弹窗。

---

## 3. 开发规范

### 3.1 TypeScript / React

- `strict: true` 已开启；禁止用 `as any`、`@ts-ignore` 绕过问题。确需逃逸时使用 `as unknown as T` 或 `@ts-expect-error` 并注明原因。
- 组件必须是函数组件 + Hooks；复杂逻辑提取为纯函数或自定义 hook。
- 类型优先从 `src/types/domain.ts` 取；数据库行类型只在 `src/types/db.ts` 内定义。
- 禁止在组件模块作用域读取主题颜色；颜色必须在渲染期通过 `makeStyles((colors) => ...)` / `useColors()` 获取。
- 列表渲染必须提供稳定 `key`；zustand 选择器必须返回稳定引用。

### 3.2 代码组织

- 单一职责；单文件建议不超过 300 行，超出必须拆分组件 / 函数 / hooks。
- 命名自释；禁止魔法数字与魔法字符串，统一收敛到 `theme`、`types` 或常量文件。
- **彻底改造原则**：需求变更时整体重构相关模块，改完即删旧代码、旧类型、旧测试；禁止打补丁、禁止保留旧实现做兼容、禁止注释掉的死代码。
- 注释解释「为什么」，不重复「代码做了什么」；中文注释保持与仓库现有风格一致。
- 日志、`console.log`、调试变量在提交前清理。

### 3.3 数据与 Supabase

- `services` 是唯一允许直接 `import { supabase }` 的业务层（`lib/supabase.ts` 除外）。
- 每个 service 方法返回**领域类型**；错误统一 `throw new Error('<面向用户的中文文案>')`。
- `supabase/schema.sql` 是幂等初始化脚本；新表 / 新字段必须同步迁移与 schema，并写中文注释。
- 新表必须启用 RLS 并编写策略；家庭共享数据以 `family_members` 为权限边界。
- 需要实时同步的表必须加入 `supabase_realtime` publication。
- 新环境变量必须同步更新 `.env.example` 与 README；真实值绝不入库。

### 3.4 UI 与设计令牌

- UI 一律使用 `src/theme` 中的颜色、间距、字号；新增颜色令牌必须同时补齐浅色 / 深色两套调色板。
- 简单提示不传 `buttons` 时自动显示「好的」；危险操作用 `style: 'destructive'`；取消用 `style: 'cancel'`。
- 页面容器必须处理安全区；顶部栏按场景使用统一的 `AppHeader` / `ScreenTopBar`（若已有）。
- 交互测试优先使用可访问性 label，避免依赖脆弱文本 / 像素快照。

### 3.5 提交与发布

- 提交信息使用 `feat / fix / refactor / test / docs / chore` 前缀，一次提交一个完整意图。
- 提交前必须通过 `npm run typecheck` 与 `npm test -- --ci`。
- 发布使用 annotated tag `git tag -a vX.Y.Z -m "..."`，tag 说明会写入 Release 并展示给用户，只写用户可感知的变化，不写实现细节。
- 不要从未经 CI 的提交直接打标签；Release 构建不会重复执行类型检查与测试。
- 发布流程、Secrets 与 APK 产物说明见 [`README.md`](./README.md#构建与发布)。

---

## 4. 测试规范

### 4.1 强制流程

1. **红**：先写能复现问题 / 表达需求的失败测试。
2. **绿**：写最小实现让测试通过，不做额外设计。
3. **蓝**：在测试保护下重构，保持全绿。

### 4.2 测试放置与覆盖重点

- 测试文件与被测文件同目录：`foo.ts` → `foo.test.ts`；组件用 `foo.test.tsx`。
- 纯逻辑、service、store 的新增 / 修改必须补测试；bug 修复必须补回归测试。
- 组件测试聚焦交互行为、禁用态、可访问性 label，不写像素快照。

| 层 | 重点 |
| --- | --- |
| `domain` | 边界值、空数据、异常输入、金额 / 日期 / 解析 / 几何计算 |
| `services` | 请求参数、字段映射（snake_case、bigint→number）、错误文案、Realtime topic 唯一性 |
| `stores` | 状态迁移、月份桶写入 / 更新 / 清理、selector 空引用稳定、reset |
| `components` | 用户交互、条件渲染、回调触发、无网络依赖 |
| `lib` | 跨平台分支、错误文案映射 |

### 4.3 Mock 规则

- 遵守 `jest.setup.ts` 的全局 mock；测试不得发起真实网络请求。
- Supabase 查询链使用 `src/test/supabase-mock.ts` 的 `createQueryChain` / `queryError` / `createRealtimeChannel`。
- 测试必须可独立运行、可离线运行、不依赖执行顺序或真实计时器。
- 不得为了通过测试而放宽全局超时、删除断言或跳过失败用例；确需调整须在注释中说明原因。

### 4.4 命令与门禁

```bash
npm run typecheck            # tsc --noEmit
npm test -- --ci             # 全量 Jest
npm run test:watch           # TDD 监听模式
npx expo install --check     # 依赖与 Expo SDK 对齐
```

CI 在 push / PR 到 `main` 时执行 `typecheck + jest`，两者必须全绿。

---

## 5. 常见变更清单

| 任务 | 最小步骤 |
| --- | --- |
| 新增纯业务规则 | `domain/foo.ts` 函数签名 → `foo.test.ts` 失败用例 → 实现 → 全绿 |
| 新增数据访问 | `types/db.ts` 映射 → `services/xxx.service.ts` → 使用 query mock 写 service test |
| 新增 store 行为 | store action → 先写状态迁移 / selector 测试 → 实现 |
| 新增页面 | 写 screen → `navigation/types.ts` 加参数 → `navigation/index.tsx` 注册 → 从入口 navigate |
| 修改数据库 | 新建幂等 migration → 必要时更新 `schema.sql` → 检查 RLS / Realtime / 注释 |
| 修改 UI 样式 | 先查 `theme` 是否已有令牌 → 缺失才补双主题 → 组件用 `makeStyles` / `useColors` |
| 修复 bug | 先写失败用例复现 → 最小修复 → 回归测试 → 全量门禁 |

---

## 6. 提交前检查清单

- [ ] `npm run typecheck` 通过。
- [ ] `npm test -- --ci` 全部通过。
- [ ] 新增 / 修改逻辑已有对应测试；bug 已有回归测试。
- [ ] 没有直接调用 Supabase 的页面 / 组件。
- [ ] 没有直接调用 `Alert.alert` / `window.alert`。
- [ ] 金额仍以整数「分」存储与计算。
- [ ] 颜色 / 间距 / 字号来自 `theme`，且浅色 / 深色成对。
- [ ] 没有新增 `any`、死代码、调试输出、真实密钥。
- [ ] 数据库变更已同步 migration / schema、RLS、Realtime 与注释。
- [ ] 依赖变更已使用 `npx expo install` 并通过 `expo install --check`。
- [ ] commit message 使用正确前缀，一次提交一个完整意图。
