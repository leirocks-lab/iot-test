# 全局 Gradle 阿里云镜像 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 安装当前 Windows 用户的全局阿里云 Maven 镜像配置，并继续构建、安装和验证 ROWAN Android 应用。

**Architecture:** 在仓库保留独立 Gradle 初始化脚本及最小测试构建，验证后安装到实际 Gradle 用户目录的 `init.d`。不修改 Expo 生成的原生项目；使用现有 JDK 17、SDK 和模拟器完成本地运行。

**Tech Stack:** PowerShell、Groovy Gradle 初始化脚本、项目现有 Gradle Wrapper、Expo 57、ADB。

**Spec:** `docs/superpowers/specs/2026-10-07-global-gradle-mirrors-design.md`（用户于 2026-10-07 确认）。

## Global Constraints

- 使用当前用户 Gradle 用户目录，预期安装路径 `C:/Users/Leon/.gradle/init.d/aliyun-maven-mirrors.gradle`；显式使用其他用户目录不继承。
- 仅映射标准 Google Maven、Maven Central、Gradle Plugin Portal，目标分别为 `https://maven.aliyun.com/repository/google`、`https://maven.aliyun.com/repository/central`、`https://maven.aliyun.com/repository/gradle-plugin`。
- 保留顺序、内容过滤、元数据配置及本地、私有、自定义、JitPack、发布仓库；不转发私有凭据，不添加原本不存在的仓库。
- 保持 HTTPS 校验，不修改 DNS、代理、hosts、Wrapper 分发地址、全局 Java 或其他项目版本。
- 保留现有初始化脚本和所有用户变更，不手改 `apps/mobile/android/`；仅提交本任务文件，在 `master` 上执行。
- 本轮构建使用 `D:/Android/Java/jdk-17.0.20.1+1` 和 `D:/Android/Sdk`；保留原全局 JDK 21。
- 镜像缺失或配置被构建明确拒绝时报告，不关闭安全校验或擅自回退。移出本任务初始化脚本即可撤销，缓存保留。

## Review Focus

1. 设置脚本和插件解析的生命周期：插件管理仓库必须在实际解析前映射。
2. 组合构建、子项目和延迟新增仓库：不能仅替换根项目最终可见的仓库。
3. 相似域名、带凭据地址及非标准路径：不能误重定向，不能把凭据发送给镜像。
4. 仓库顺序及过滤：禁止清空后重建仓库，限制性仓库模式仍可使用。
5. 重复安装、已有全局配置和低内存：不覆盖未知文件，不关闭其他用户程序，不将镜像成功等同于应用成功。

---

### Task 1: 测试并安装全局镜像脚本

**Files:**
- Create: `scripts/gradle/aliyun-maven-mirrors.gradle`（可安装的唯一配置源）。
- Create: `scripts/gradle/README.md`（安装范围、验证命令和撤销方法）。
- Create: `tests/gradle-mirrors/settings.gradle`、`tests/gradle-mirrors/build.gradle`。
- Create: `tests/gradle-mirrors/included/settings.gradle`、`tests/gradle-mirrors/included/build.gradle`。
- Install: 实际 Gradle 用户目录下 `init.d/aliyun-maven-mirrors.gradle`。

**Interfaces:**
- Consumes: 标准 Gradle 仓库容器及现有 Wrapper。
- Produces: 自动加载的初始化脚本；测试任务 `verifyMirrorRepositories` 和 `verifyIncludedMirrorRepositories`，断言失败返回非零退出码。测试构建用 `-PcredentialConflict=true` 单独启用标准仓库凭据冲突场景，正常场景不配置该冲突。
- 脚本内部映射入口：`mirrorUrl(URI source): URI`；不匹配时返回原地址。只安装下载仓库钩子，不操作发布仓库。

- [ ] **Step 1:** 阅读项目版本对应的官方 Gradle 初始化脚本与仓库 API 文档；检查实际用户目录、已有初始化脚本和工作区状态。
- [ ] **Step 2:** 创建失败测试，覆盖设置插件/依赖仓库、项目/buildscript 仓库、子项目和 included build、延迟新增仓库及限制性仓库模式。核心断言：标准仓库 URL 等于上述三个镜像 URL；仓库数量和顺序不变；`mavenLocal()`、JitPack、私有及发布 URL 不变；过滤和元数据策略不变；相似域名/非标准路径不匹配；携带私有凭据的仓库不得发往镜像。
- [ ] **Step 3:** 设置进程 JDK 17，执行 `apps/mobile/android/gradlew.bat -p tests/gradle-mirrors verifyMirrorRepositories verifyIncludedMirrorRepositories --offline --console=plain`，期望因标准地址未映射而 FAIL，而不是语法或工具缺失。
- [ ] **Step 4:** 实现独立初始化脚本，使用解析前的生命周期钩子处理 settings、project 和 buildscript 仓库，监听后续新增仓库；保留仓库对象及其配置。凭据冲突应明确报错，不转发或静默删除凭据。
- [ ] **Step 5:** 在 Step 3 命令中增加 `-I scripts/gradle/aliyun-maven-mirrors.gradle`，期望正常场景全部断言 PASS、`BUILD SUCCESSFUL`；再增加 `'-PcredentialConflict=true'` 单独运行，期望非零退出码及明确凭据冲突提示，不发生网络请求。测试不依赖外部网络。
- [ ] **Step 6:** 写安装及撤销说明。解析安装目标绝对路径，读取已有目标；未知不同内容则暂停报告冲突，不覆盖。不存在时通过获准的文件复制安装；再次安装相同内容视为无操作。
- [ ] **Step 7:** 比较源/安装文件 SHA256，重新执行不带 `-I` 的 Step 3 命令，期望 PASS。核对未改变其他初始化脚本、全局 Java 或项目原生文件。
- [ ] **Step 8:** 只提交本任务配置、说明及测试文件：`git commit --only <本任务文件列表> -m "build: add verified global Aliyun Gradle mirrors"`。

### Task 2: 构建并运行 ROWAN

**Files:**
- No application source changes planned；仅产生忽略的构建输出、临时日志及截图。

**Interfaces:**
- Consumes: Task 1 已自动生效的配置、现有原生项目、AVD `ROWAN_API_36`。
- Produces: debug APK、已安装并展示 ROWAN 首页的模拟器、验证结果。

- [ ] **Step 1:** 检查内存、ADB 和端口；必要时只通过 `adb emu kill` 正常关闭本次模拟器。先读 Expo 57 对应文档及本地 CLI 的开发客户端启动实现，再选择启动链接。
- [ ] **Step 2:** 在 `apps/mobile/android` 设置进程 `JAVA_HOME`、`ANDROID_HOME` 和 PATH，运行下列构建命令。用 `--info` 日志确认 ROWAN 及组合构建中的下载仓库确实映射到阿里云；区分已缓存资源与实际网络请求。

```powershell
.\gradlew.bat app:assembleDebug '-PreactNativeArchitectures=x86_64' --max-workers=2 '-Dorg.gradle.jvmargs=-Xmx1536m -XX:MaxMetaspaceSize=512m -Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8' '-Pkotlin.compiler.execution.strategy=in-process' --console=plain --info
```

- [ ] **Step 3:** 检查退出码 0、`BUILD SUCCESSFUL` 和 `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`。失败则先诊断，不扩大到版本升级或安全配置变更。
- [ ] **Step 4:** 若需要释放内存，核对并停止本次创建的 Gradle 进程；启动 `ROWAN_API_36`，等待 `sys.boot_completed=1`。使用 `adb install -r` 安装 APK，期望 `Success`。
- [ ] **Step 5:** 从仓库执行 `pnpm dev`，设置 `adb reverse tcp:8081 tcp:8081`，根据本地实际配置启动开发客户端。验证 `com.rowan.iot.dev` 前台活动、Metro 连接、首页截图及 logcat 无启动崩溃。
- [ ] **Step 6:** 执行 `pnpm lint`、`pnpm typecheck`，期望均退出 0。分别报告镜像安装、APK 构建、应用运行结果及残留限制；不得把未验证项表述为完成。

## 自审与执行状态

上述两项任务覆盖方案全部要求；Review Focus 的五类风险分别落实在 Task 1 的测试/安装检查与 Task 2 的内存/运行验证中。保留此前选择的 Native 执行方式，不创建新分支、不改动用户已有文件。

计划待用户审阅确认后实施；目前尚未安装全局配置。
