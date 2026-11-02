# Android Home 受控 UI 验证

真实 HomeActivity、HomeRoomTabs、原生返回栈及内置 RN 容器运行于 API36、隔离 development Release。test-only Application 注入唯一真实 AccountService、内存账号存储和无业务网络委托的公开 fixture；不替代真实 HTTP/MQTT、产品字段或硬件验收，不修改原安全账号存储。没有生产测试开关、任意 fixture Intent 或新增导出权限。

Release AndroidTest 的严格锁图已真实生成并核验（262模块、139配置），保留 STRICT；技术日志见测试报告 android-release-androidtest-dependency-locks.*。结构 RED 为缺少open/createServices/构造注入，合入后实际消费者编译通过。真实 UI 场景尚待执行，37项collector离线用例仅为公共合成向量。

构建匹配双APK（使用项目正式build.mjs及私密本地配置，凭据不入构建）；宿主先构建，再构建`:app:assembleDevelopmentReleaseAndroidTest`，后者来源记录要求宿主哈希及源码一致。只允许已退出真实测试会话的专用基础模拟器，先记录双APK SHA。

```powershell
adb -s emulator-5554 install -r <matching-host-release.apk>
adb -s emulator-5554 install -t -r <matching-release-androidTest.apk>
adb -s emulator-5554 shell am instrument -w -e emitPublicArtifacts true com.rowan.iot.dev.refactor.test/com.rowan.iot.fixtures.HomeFixtureInstrumentation > .cache/refactor/home-fixture-instrument.log
node docs/tools/android-home-fixtures/collect_results.mjs --input=.cache/refactor/home-fixture-instrument.log --expected-apk-sha=<host-sha256> --expected-test-apk-sha=<test-sha256>
```

不要向会话打印完整日志（含公开PNG base64）。collector先有界读取、核验完整结果、窗口几何、9/10幅必需PNG及五条导航证明和双APK SHA，才导出固定.cache/refactor/android-home-ui-fixtures-runs/<UUID>。缺图、缺块、重复、缺导航或修改中的日志均拒绝；失败保留失败，可选S031不可用明确partial/exit2。Root应校验后归档实际JSON/PNG到docs/测试报告，不把1×1工具向量当模拟器截图。

Runner只接受emitPublicArtifacts布尔值。它会记录实际同名typed房间、空态、加载/错误保缓存、长名称、离页旧读、原Rooms及Device/RN返回和账号重建；S031存在时补多选。本地截图只包含已校验的公开Home窗口，原始含输入/其它应用页面不进入输出。iOS无对应运行证明。
