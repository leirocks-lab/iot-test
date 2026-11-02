# 有界、只读 Android UI snapshot

用于当前 AVD 经典 `uiautomator dump` 等待 idle 超时的 QA 工具，不修改 App、不点击页面、不登录、不执行设备动作。没有依赖 App 已 idle 的假设。

## 准备与同步调用

```powershell
node docs/tools/android-ui/prepare.mjs emulator-5554
```

prepare 使用固定 JDK17（`D:/Android/Java/jdk-17.0.20.1+1`）、SDK36 android.jar 和 build-tools/36.0.0/lib/d8.jar，独立 javac/d8 构建 dex zip，不运行 Gradle。源码在本目录，输出在 `.cache/refactor/android-ui-helper/<sourceHash>/`，同时保留 `.cache/refactor/rowan-ui-export.jar`。仅推送 `/data/local/tmp/rowan-ui-export.jar`；stdout 为 source/artifact SHA-256 和固定阶段信息。

供现有 harness 引用：

```js
import {dumpHierarchy, AndroidUiSnapshotError} from './android-ui/snapshot.mjs';
const xml = dumpHierarchy('emulator-5554', '/sdcard/rowan-public-ui.xml');
// 只在内存匹配 id/class/text/content-desc/bounds/enabled/checked，禁止打印/归档 xml。
```

`dumpHierarchy(serial, path)` 是同步函数，必须显式传路径。默认且当前仅支持 `emulator-<digits>`；路径只允许 `/sdcard/rowan-[a-z0-9-]+.xml`（最长128字符）。不接受物理设备、任意路径、shell片段或未指定路径。

它先删除目标旧文件，给本次 capture 随机12位ID，启动唯一短 nice-name 的 shell app_process，读取与 ID 一致且完整的 redacted XML 后返回字符串，并在 finally 删除远端文件。调用方不再执行旧 `uiautomator dump` / 二次 cat。进程失败/输出缺失不复用任何旧 XML；错误只返回有限 `AndroidUiSnapshotError.code/stage`，不传播 adb stdout/stderr/命令或原始异常详情。

可选安全 smoke CLI：

```powershell
node docs/tools/android-ui/snapshot.mjs emulator-5554 /sdcard/rowan-ui-smoke.xml
```

只输出节点数量、根类、根尺寸、耗时和错误代码，不输出 XML、text 或 content-desc。当前活动窗口可能是系统对话框，成功导出不代表 App/Home 正常或业务验收通过。

## 工作方式和边界

- 用反射调用系统 `UiAutomationShellWrapper.connect/getUiAutomation/setCompressedLayoutHierarchy(false)`，再使用 SDK AccessibilityNodeInfo 自行遍历；不调用或复制 AOSP dumper，不调用 waitForIdle。系统 jar 为 dex-only，不作为 javac classpath。
- 根就绪仅短重试2秒。单次 Binder 查询自身可能阻塞，独立9秒 watchdog 强制终止本 helper，因此整体不被其无限拖住。
- 仅根和 visible children，最多2000节点/48层/1MiB XML。超限失败且删除输出，不返回部分树。长公开文本替换为 `[text truncated]`，不裁出可能残留的账号片段。rotation 未取得时明确为 -1，不伪造旋转状态；bounds 是真实屏幕坐标。
- 所有 editable/EditText、password节点和已知 account/registration/recovery 邮箱/密码/确认/验证码ID的 text/content-desc 均替换。直接输入的局部分组也脱敏，覆盖自绘验证码兄弟格。其他文本中的邮箱（含Unicode本地名）及 ws/wss URL 脱敏。输入值不打印、不归档。
- XML保留 resource-id、class、package、bounds、enabled/checked/checkable/clickable/scrollable/focusable/focused/selected/long-clickable/password 等只读匹配属性。
- disconnect 在单独 daemon thread 最多等待400ms，随后 Runtime.halt，不能因清理卡住保留进程。主进程还有 watchdog；Node finally 只按本次随机 nice-name 兜底终止 helper，不触碰 App、系统 UI、ADB server 或其他 instrumentation。
- 一个设备同一时刻由一个 harness 使用。跨进程并发 UiAutomation 会话不属于此工具的共享能力。需重新 prepare 后再使用修改过的 Java 源码。

## 本轮真实检查

- javac17 + d8(minApi24) 实际通过并完成 push。最终 source SHA-256 `2f7f9c77d995b6a715b7c42299fc8b6b31dcf7fdb75a3faccae14a54acd7d4a1`；artifact SHA-256 `8dcb019ca1e0f9300499e555e2722d0c7fc93144fe925746afab6d6f6dede8f4`。
- 首次只读导出成功：12节点、android.widget.FrameLayout、712×391，包含主机ADB往返的总耗时7930ms；没有经典 CLI 30秒 idle timeout。
- 根随后授权二次只读分类。最终 helper 实际确认已知系统 ID 集合 `android:id/aerr_wait`、`android:id/aerr_close`、`android:id/alertTitle`，且归属白名单匹配 ROWAN验证。只输出 ID 集合和归属，没有输出原始 message/XML。**这是 ROWAN 验证应用 ANR 对话框，不能算 Home 正常验收。** 未点击等待/关闭、未截图、未杀 App；ADB已释放给根调查。
- Android sandbox 默认隔离无法连接既有 ADB server；授权 escalation 后完成 push/只读导出，没有重启或杀 ADB server。实际运行环境的进程权限仍需允许访问已有 emulator ADB server。

根因依据：[AOSP DumpCommand](https://android.googlesource.com/platform/frameworks/testing/+/refs/heads/main/uiautomator/cmds/uiautomator/src/com/android/commands/uiautomator/DumpCommand.java) 在 getRoot 前显式调用 waitForIdle；本工具绕过这一等待，只读当前实际 active window。它修复 QA 导出路径的 idle 依赖，不宣称修复 App ANR。
