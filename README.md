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
2. 打开 Dashboard → SQL Editor，整体执行 `supabase/schema.sql`（幂等脚本，可重复执行；每张表和字段均带中文注释）；
3. 复制 `.env.example` 为 `.env`，填入项目 URL 与 Anon Key：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> Supabase 信息一律通过 `EXPO_PUBLIC_*` 环境变量注入（由 `app.config.js` 与 `src/lib/supabase.ts` 读取），**仓库中不提交任何真实连接信息**；`.env` 已被 `.gitignore` 忽略，仅提交 `.env.example` 模板。

数据库脚本包含：用户资料/家庭/家庭成员/账本/分类/流水六张表（含月度预算列）、RLS 行级安全策略、注册自动建档（资料 + 个人账本 + 默认分类）、新账本自动播种默认分类、邀请码生成与 `join_family` RPC、流水表 Realtime 发布、头像存储桶与策略，并为所有表和字段写了中文注释。

### 2. 启动

```bash
npm install
npm start        # Expo Dev Server，用 Expo Go 扫码即可运行
```

## 打包 Android APK（GitHub Actions）

完全在 GitHub Actions Runner 上构建，**不依赖 Expo / EAS 账号**：CI 内先 `expo prebuild` 生成原生工程，再用 Gradle 打包，并用仓库 Secrets 里的 keystore 签名。JDK 17 与 Android SDK 由 Runner 自带，无需额外准备。

仓库内置三条工作流：

- `.github/workflows/ci.yml`：push / PR 到 main 时执行 `typecheck + jest` 质量门禁；
- `.github/workflows/warm-android-cache.yml`：在 main 上预热 Gradle 依赖与构建缓存（仅在依赖 / 配置变更或手动触发时运行），让标签发布构建免于冷启动；
- `.github/workflows/release.yml`：推送 `v*` 标签或手动触发时，在 Runner 上构建 Android **APK**，产物上传到 Actions Artifacts（`family-piggy-apk`）。

### 一次性准备

1. **生成签名 keystore**（本机执行一次；务必自行备份，丢失后无法覆盖升级已安装的 App）：

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore release.keystore \
  -alias family-piggy \
  -keyalg RSA -keysize 2048 -validity 10000
```

2. **把 keystore 转成 Base64**（Windows PowerShell）：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

> macOS / Linux 用 `base64 -w0 release.keystore`。
> keystore 已被 `.gitignore` 忽略（`*.keystore` / `*.jks`），**不要提交**。

3. **在 GitHub 仓库 Settings → Secrets and variables → Actions 配置 5 个 Secrets**：

| Secret | 说明 |
| --- | --- |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | Supabase Anon Key |
| `ANDROID_KEYSTORE_BASE64` | 第 2 步得到的 keystore Base64 文本（单行） |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码（PKCS12 下 key 密码与其相同） |
| `ANDROID_KEY_ALIAS` | keystore 别名（示例中为 `family-piggy`） |

4. **（可选）应用图标与启动图**：`app.config.js` 目前未配置 `icon / adaptiveIcon / splash`，未配置时使用 Expo 默认图标。

### 触发与产物

```bash
# 手动触发：Actions → Release Build → Run workflow
git tag v0.1.1 && git push origin v0.1.1   # 打标签触发，版本名取 tag 去掉 v
```

产物在运行页的 Artifacts（`family-piggy-apk`），下载后可直接安装。工作流会打印 APK 的签名信息，并校验签名不是 debug 证书。

### 环境变量与版本号注入链路

```
GitHub Secrets
  └─ job 级 env：EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
       └─ gradle assembleRelease 触发 Metro 打包时，把 EXPO_PUBLIC_* 内联进 bundle

github.run_number → ANDROID_VERSION_CODE → app.config.js 的 android.versionCode（每次构建递增，保证可覆盖升级）
tag v0.1.1        → APP_VERSION          → app.config.js 的 version
```

> `EXPO_PUBLIC_*` 会被内联进客户端代码，属于公开信息；真正需要保密的是 keystore 与其密码，仅以 Secrets 形式保存在仓库设置中。

### 构建失败排查

| 现象 | 原因与处理 |
| --- | --- |
| `Plugin [id: 'expo-module-gradle-plugin'] was not found` | node_modules 里混入了其他 SDK 版本的原生模块（多为 `expo-font` / `expo-asset` 等被宽松版本范围拉高）。跑 `npx expo install --check` 看清单，再用 `npx expo install <包名>` 装回 SDK 期望版本；本地开发用 Expo Go 不会暴露此问题，只有原生构建才会 |
| `Could not get unknown property 'release' for SoftwareComponent container` | 同上，是版本错配的连带报错，依赖对齐后即消失 |
| `APK 仍是 debug 签名` | keystore Secrets 未生效，检查 `ANDROID_KEYSTORE_BASE64` / 密码 / 别名 |
| 发布构建很久，卡在 `Downloading …gradle-*-all.zip` | GitHub 缓存按 ref 隔离，tag 构建只能读默认分支的缓存，而 main 上从不执行 Gradle，所以每次都是冷启动。处理：到 Actions 手动触发一次 **Warm Android Cache**（或 push 改动 `package.json` / `package-lock.json`）把缓存预热到 main 作用域；另外 release 已把分发包换成体积更小的 `-bin` |

依赖约定：Expo 生态包一律用 `npx expo install <包名>` 安装（版本范围由 SDK 决定），不要手写 `^` 范围。

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
