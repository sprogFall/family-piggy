#!/usr/bin/env bash
set -euo pipefail

# 这个脚本在 `npx expo prebuild` 生成 android/ 之后运行，用于统一 CI 与发布
# 构建的 Gradle 参数。warm-android-cache.yml 和 release.yml 必须使用同一套
# 参数，否则 Gradle 本地 build cache 的任务 key 不一致，预热缓存无法命中。

GRADLE_PROPERTIES="android/gradle.properties"
APP_GRADLE="android/app/build.gradle"

set_prop() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$GRADLE_PROPERTIES"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$GRADLE_PROPERTIES"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$GRADLE_PROPERTIES"
  fi
}

# 1. 给 Gradle daemon 足够堆内存，替换 Expo 模板默认的 -Xmx2048m。
set_prop org.gradle.jvmargs '-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8'

# 2. 启用并行与本地 build cache。setup-gradle 会缓存 Gradle User Home，
#    包括 caches/build-cache-1，因此 main 上 warm 一次，tag/发布构建可复用任务输出。
set_prop org.gradle.parallel true
set_prop org.gradle.caching true

# 这个 App 的图片资源主要是 vector / 字体；关闭 release PNG crunching，
# 用少量包体积换取更短的资源处理时间。
set_prop android.enablePngCrunchInReleaseBuilds false

# 3. assembleRelease 默认会跑 lintVitalRelease。当前仓库质量门禁是
#    typecheck + jest，Android lint 不适合拖在发布打包步骤里。
#    这里关闭 release lint；如需 lint 门禁，应在 ci.yml 里单独跑。
cat >> "$APP_GRADLE" <<'GRADLE_EOF'

android {
    lint {
        checkReleaseBuilds = false
    }
}
GRADLE_EOF

echo "Gradle 构建参数已应用："
grep -nE '^(org.gradle.(jvmargs|parallel|caching)|android.enablePngCrunchInReleaseBuilds)=' "$GRADLE_PROPERTIES"
grep -n -A5 'checkReleaseBuilds' "$APP_GRADLE"
