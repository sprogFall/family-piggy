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
   - 若数据库是**旧版本**初始化的，按文件名顺序执行 `supabase/migrations/` 下的增量脚本：历史备注会自动迁移为标签、修复「创建家庭 / 新建个人账本报错」的 RLS 策略问题；`20260928220000_tag_category_and_tx_currency.sql` 再把标签从「按收支类型」迁移为「按分类」归属，并给流水加上币种列；`20260929090000_transaction_note_types_images.sql` 重新引入独立的流水备注、JSONB 记账类型扩展字段和最多 3 张账单图片，并创建 `transaction-images` 存储桶；`20260930090000_import_recorder_mapping.sql` 新增导入记录人映射所需的 RLS 辅助函数与 INSERT 策略；`20260930100000_transaction_multi_tags.sql` 把 `transactions.tag_id` 升级为 `tag_ids uuid[]` 多标签数组并回填历史数据，新增标签归属校验与删除清理触发器；
3. 复制 `.env.example` 为 `.env`，填入项目 URL 与 Anon Key：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> Supabase 信息一律通过 `EXPO_PUBLIC_*` 环境变量注入（由 `app.config.js` 与 `src/lib/supabase.ts` 读取），**仓库中不提交任何真实连接信息**；`.env` 已被 `.gitignore` 忽略，仅提交 `.env.example` 模板。

数据库脚本包含：用户资料/家庭/家庭成员/账本/分类/标签/流水七张表（含月度预算列）、RLS 行级安全策略、注册自动建档（资料 + 个人账本 + 默认分类）、新账本自动播种默认分类、邀请码生成与 `join_family` RPC、流水表 Realtime 发布、头像与账单图片存储桶及策略，并为所有表和字段写了中文注释。

> `ledgers` 的 SELECT 策略特意写成 `owner_id = auth.uid() or can_access_ledger(id)`：`can_access_ledger` 是 stable security definer 函数，在同一条 `INSERT` 语句内看不到刚插入的行，若策略只依赖它，`.insert().select()` 会被过滤成 0 行（PostgREST 报 PGRST116），表现为「账本已写入却提示创建失败」。

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
- `.github/workflows/release.yml`：推送 `v*` 标签或手动触发时，在 Runner 上构建 Android **APK**，并发布为 **GitHub Release 资产**（可直接下载安装的 `.apk`，不是需要解压的 zip）。

> 工作流统一固定在 `ubuntu-24.04` 镜像，并使用原生声明 Node 24 运行时的 action 版本：前者避免 `ubuntu-latest` 迁移（2026-10-19 起切到 Ubuntu 26）造成构建环境被动突变，后者消除 Node 20 弃用告警。`gradle/actions/setup-gradle` 刻意停在 v5 —— v6 起默认改用专有的 enhanced 缓存实现，而 v5 与 v4 的缓存 key 格式一致，升级不会让已预热的缓存失效。升级 action 大版本前请先确认破坏性变更。

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

4. **应用图标与开屏**：`app.config.js` 已配置 `icon: ./assets/icon.png`、`android.adaptiveIcon`（`foregroundImage: ./assets/adaptive-icon.png`、`backgroundColor: #9DD9BE`），并用 `expo-splash-screen` 把**原生开屏**配成「同一张应用图标居中（`imageWidth: 200`）+ 主题底色」：浅色品牌绿 `#9DD9BE`，深色换成 App 深色页面底 `#111111`（图标不变，不另做深色图标）。两张图都由设计稿裁掉白边生成——圆角方块外的白底用边界色无缝延续成满幅；自适应图标的主体（笔记本 / 铅笔 / 叶子 / 金币）额外收在安全区内，圆形与圆角方形遮罩都不会裁到。`app.config.test.js` 守住「文件存在、1024×1024、最外圈无白边、主体在安全区、开屏配置齐备」。
   - 换图标直接覆盖 `assets/` 下两个 PNG（保持 1024×1024 正方形）即可，无需改代码：启动器图标、原生开屏、应用内开屏与登录 / 关于页的 `AppLogo` 都用这一份资源（原生开屏要重新构建才生效）。

### 触发与产物

```bash
# 手动触发：Actions → Release Build → Run workflow
git tag v0.1.1 && git push origin v0.1.1   # 打标签触发，版本名取 tag 去掉 v
```

产物发布在仓库的 **Releases** 页面（不是 Actions Artifacts —— Artifacts 会被 GitHub 强制打成 zip）：

| 触发方式 | 发布标签 | 说明 |
| --- | --- | --- |
| 推送 `v*` 标签 | 该标签（如 `v0.1.2`） | 正式 Release |
| 手动 Run workflow | `build-<run_number>` | 预发布（prerelease），便于随时拿到安装包 |

在 Release 页面的 **Assets** 里直接点击 `family-piggy-<tag>.apk` 即可下载安装，**无需解压**；同一标签重跑会覆盖同名资产（幂等）。工作流会打印 APK 的签名信息、校验签名不是 debug 证书，并把 Release 链接写入运行摘要。

> 工作流需要 `contents: write` 权限来创建 Release（已在 `release.yml` 中声明）。若仓库/组织策略把默认 `GITHUB_TOKEN` 限制为只读，请到 Settings → Actions → General → Workflow permissions 调整为 "Read and write permissions"。

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

## 应用内更新

Android 端「关于我们」页会自动检查新版本，并支持应用内下载与安装（思路参照 [life_tools](https://github.com/sprogFall/life_tools)）：

- **检查**：匿名调 GitHub Releases API 取最新**正式**版本（草稿与预发布包不会推给用户），再与当前 `version` 做语义化版本比较；
- **下载**：按「Release 说明里的 `APK-Mirror` → `gh-proxy.com` 镜像 → GitHub 直连」依次回退，边下边显示进度；
- **校验**：按资产大小 + Release 说明里的 `SHA256` 行做完整性校验（纯 JS 分块哈希，几十 MB 的包不会一次性读进内存）；
- **安装**：唤起系统安装器；Android 8+ 首次需在手机上允许本应用「安装未知应用」，卡片会给出跳转入口；
- **忽略版本**：点「忽略此版本」后不再提示，随时可「仍要查看」。

> ⚠️ 该功能要求仓库为**公开**：私有仓库匿名访问 GitHub API 与 Release 资产一律 404（此时卡片显示「暂时无法获取更新信息」而不是报错）。
> `SHA256` 行由 `release.yml` 在发布时自动写入 Release 说明；镜像行可选，追加 `APK-Mirror: https://...` 即可，App 端无需发版。

## 常用命令

```bash
npm test          # 运行全部测试（Jest）
npm run test:watch
npm run typecheck # tsc --noEmit
```

## 功能清单

- 邮箱注册 / 登录（注册即自动创建「个人账本」与默认分类）
- 多账本：个人账本、家庭账本自由切换，可新建个人账本；按账号记住上次打开的账本，重启 App 后自动恢复
- 记一笔：顶部**加高的金额行**（币种符号 + 大号金额，未输入时为弱化的 0.00）与右侧日期（「今天 21:25 / 8月3日 / 2024年8月3日」），下方是支出/收入切换、分类九宫格、标签选择（可新增 / 复用 / 长按删除）、备注、记账类型、账单图片；金额键盘右侧加减乘除与完成无缝拼接；输入表达式时顶部实时显示计算结果、灰色小字保留计算过程；点击金额行唤起键盘，备注输入时自动隐藏
- 标签与备注：一笔流水可多选标签，标签隶属于分类并可复用；备注是本笔独有字段，与标签分开保存、不可复用。账单列表把标签拼在分类后展示，例如「餐饮[午餐,奶茶]」
- 记账类型：数据库以 `transactions.attributes` JSONB 预留扩展；记一笔用边框胶囊勾选「报销」，账单页支持按 全部 / 报销 / 未报销 筛选，后续新增类型无需改表
- 账单图片：每笔最多 3 张，上传到 Supabase Storage `transaction-images/<uid>/`，账单列表展示缩略图，编辑时可删除
- 多币种：每笔流水记录自己的币种，明细按各自符号展示（`¥` / `$` / `€` / `HK$` / `£`）；首页 / 统计 / 账单的汇总、占比、趋势一律只统计当月**主币种**（出现次数最多的币种），另有外币时给出「另有 N 笔外币记录未计入」提示，绝不跨币种相加
- 账单列表：按天分组、日小计、月汇总；支持按收入/支出、记录人筛选，支持按分类 / 标签关键词搜索；点击账单进入预览（预览页可修改 / 删除），左滑账单行可露出编辑 / 删除按钮
- 成员记账标注：家庭账本的每条账单标明「谁记的」，统一显示成员昵称
- 月度预算：按账本设置，首页汇总卡展示使用进度与超支提醒
- 首页与统计：首页为月度汇总卡、每日收支趋势、支出占比；统计页支持按日 / 月 / 年切换，并展示汇总、趋势 / 月度明细与分类构成
- 分类管理：新增 / 编辑 / 删除（支出与收入独立）；长按分类可拖拽排序，排序在前端预览，点「保存排序」后落库并同步到记账页分类网格；未保存退出会二次确认
- 家庭：创建家庭（自动建家庭账本）、邀请码加入、成员管理、退出 / 解散
- 多人共同记账：家庭账本全员可记账，流水 Realtime 实时同步
- 头像：从相册选择上传至 Supabase Storage，个人资料实时更新
- 导出：当月流水导出 Excel(.xlsx) / CSV（表头为 日期/类型/分类/标签/备注/金额/币种/记录人/报销），家庭账本写出成员昵称，系统分享
- 导入：先选择目标账本，再解析 Excel / CSV、映射来源记录人并预览前 20 条确认；识别交易类型 / 类别 / 描述 / 创建者 / 是否报销等常见表头，标签字段按 `/` 拆分多个标签并自动创建 / 复用，缺失分类自动创建后批量入库
- 设置：深色模式三档（跟随系统 / 浅色 / 深色，深色为微信风格：`#111111` 页面底 + `#1E1E1E` 卡片）、全局字体大小四档（小 / 标准 / 大 / 超大，标准为设计基准），两者都有本地持久化、即时生效（无需重启）
- 应用内更新：「关于我们」页以应用图标 + 更新卡片展示；检查 GitHub Release（仅正式版）→ 应用内下载（镜像回退）→ SHA-256 完整性校验（单独展示校验进度，不会卡在「下载 100%」）→ 拉起系统安装器，可忽略指定版本

## 目录结构

```
src/
  domain/      纯函数业务逻辑（金额、日期、统计、图表几何、CSV）+ 测试
  services/    Supabase 数据访问层 + 测试
  stores/      zustand 状态层 + 测试
  components/  通用 UI 组件与图表
  screens/     页面（auth / home / add / bills / stats / category / family / export / import / profile / settings / about）
  navigation/  路由与类型
  theme/       设计令牌（浅色/深色调色板、间距、字号）+ makeStyles/useColors 样式工厂 + 图标映射
  types/       领域类型、数据库行类型与 GitHub Release 行类型映射
  lib/         supabase client 与通用工具
assets/        应用图标（icon.png 通用图标 / adaptive-icon.png Android 自适应前景）
supabase/      schema.sql（表结构 / RLS / 触发器 / Realtime）+ migrations/（增量迁移）
```

## 开发约定

见 [AGENTS.md](./AGENTS.md)：TDD 强制、TypeScript strict、彻底改造原则（不做补丁）、金额一律以「分」计算、页面禁止直连 Supabase。

## 路线图

- 手机号 + 短信验证码登录（需 Supabase SMS Provider）
- iOS 正式包（AAB / TestFlight）发布流水线
