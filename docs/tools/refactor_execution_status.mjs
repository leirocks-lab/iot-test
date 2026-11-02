// Curated execution overlay. Source mapping and passing subchecks never close a scope row.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const mapping=read('docs/SDD/重构范围映射核对.json');
const report='docs/测试报告/重构实施-20261101/';
const latestEmulator='android-emulator-2026-11-01T16-50-54.643Z.json';
const latestUnit='android-unit-2026-11-01T16-41-19.116Z/summary.json';
const latestRN='rn-page-close-repeat-summary.json';
const scanEvidence='android-scan-software-2026-11-01T17-27-42.092Z.json';
const scanLayoutEvidence='android-scan-denied-layout-2026-11-01T17-48-40.395Z.json';
const newerUnitEvidence='android-unit-2026-11-01T18-07-45.739Z/summary.json';
const roomTabsUnitEvidence='android-unit-2026-11-01T18-11-30.635Z/summary.json';
const roomTabsUnit=read(report+roomTabsUnitEvidence);
const preferencesUnitEvidence='android-unit-2026-11-01T18-17-50.155Z/summary.json';
const preferencesLintEvidence='android-account-home-preferences-lint-provenance.json';
const preferencesReleaseEvidence='android-account-home-preferences-release-provenance.json';
const preferencesUnit=read(report+preferencesUnitEvidence),preferencesLint=read(report+preferencesLintEvidence),preferencesRelease=read(report+preferencesReleaseEvidence);
const preferencesSource='0e254d1a1928f49e46298d32388318d9f7ac8dca8cdd829396a99b225697a9fb';
const candidateAPK='c08d29c5907eb29a0c9226f822dbcdc22dcdd58ee2ce3b0c7c8c26b53851b2d6';
const roomTabsEvidence=report+'home-room-tabs-reviewed-manifest.json';
const newerUnit=read(report+newerUnitEvidence),scanLayout=read(report+scanLayoutEvidence),roomTabs=read(roomTabsEvidence);
const lintEvidence='android-scan-final-lint-provenance.json';
const releaseEvidence='android-scan-release-provenance.json';
const iosEvidence='ios-as/Verification/设备昵称基础-20261102.md';
const iosLoginEvidence='ios-as/Verification/S016邮箱验证码登录-20261102.md';
const androidLoginEvidence=newerUnitEvidence;
const scan=read(report+scanEvidence),lint=read(report+lintEvidence),release=read(report+releaseEvidence);
const emulator=read(report+latestEmulator),unit=read(report+latestUnit),rn=read(report+latestRN);
const verifiedAPK='b8e50abf3df261d6bcfd556a5d9ea30ca8971e6da7f3d910ba22a7a87a94394f';
const verifiedSource='5d152ab3684c4f17415e9dd9487deb09b81d9fb9061488dd0ac755d28f7672cc';
const passed=emulator.results.filter(x=>x.result==='通过').length,blocked=emulator.results.filter(x=>x.result==='阻塞').length;
if(emulator.installedArtifactSha256!==verifiedAPK||!emulator.installedArtifactMatchesBuild||
  emulator.sourceSha256!==verifiedSource||emulator.sourceFiles!==292||
  emulator.buildProvenance?.sourceBefore?.sourceSha256!==verifiedSource||emulator.buildProvenance?.sourceAfter?.sourceSha256!==verifiedSource||
  !emulator.buildProvenance?.sourceUnchangedDuringBuild||passed!==24||blocked!==2||emulator.results.length!==26||
  emulator.sessionKept!==true||emulator.dnsForwarding?.state!=='closed')throw new Error('Latest APK/emulator evidence does not match the reviewed facts');
for(const [id,state] of [['MORE-native-rn-summary',undefined],['MORE-native-rn-members','loaded'],['MORE-native-rn-help','empty'],['MORE-native-rn-location','unknown']]) {
  const value=emulator.results.find(x=>x.id===id);
  if(value?.result!=='通过'||(state!==undefined&&value.state!==state))throw new Error(`Latest More evidence mismatch: ${id}`);
}
if(unit.totals.tests!==450||unit.suites.length!==41||unit.totals.failures!==0||unit.totals.errors!==0||unit.totals.skipped!==0||unit.provenance.exitCode!==0||
  unit.provenance.sourceAfter.sourceSha256!==verifiedSource||rn.checks.vitest.tests!==100||rn.checks.vitest.files!==11||
  rn.checks.codegen.bridgeMajor!==3||['lint','typecheck','vitest','codegen'].some(key=>rn.checks[key].exitCode!==0))throw new Error('Latest offline checks do not match the reviewed facts');
for(const [name,value,unchanged] of [['lint',lint,'sourceUnchangedDuringCheck'],['release',release,'sourceUnchangedDuringBuild']]) {
  if(value.sourceBefore?.sourceSha256!==verifiedSource||value.sourceAfter?.sourceSha256!==verifiedSource||!value[unchanged]||
    (name==='lint'?value.exitCode!==0:value.artifactSha256!==verifiedAPK))throw new Error(`Latest ${name} evidence mismatch`);
}
for(const file of ['android-scan-final-lint.log','android-scan-release.log'])if(!readFileSync(new URL(report+file,root),'utf8').includes('BUILD SUCCESSFUL'))throw new Error(`Unsuccessful check: ${file}`);
if(scan.installedArtifactSha256!==verifiedAPK||scan.sourceBefore?.sourceSha256!==verifiedSource||scan.sourceAfter?.sourceSha256!==verifiedSource||!scan.sourceUnchanged||
  ['camera-denied-album-available','photo-picker-normal','photo-picker-blank','photo-picker-multiple','scan-return-home'].some(id=>scan.results.find(x=>x.id===id)?.result!=='通过')||
  scan.results.find(x=>x.id==='live-camera-frame-decode')?.result!=='未验收'||scan.mediaCleanup.length!==3||
  [scan.permissionRestoration,scan.logout,...scan.mediaCleanup].some(x=>x?.result!=='通过')||
  scan.pickerRestoration?.result!=='不适用'||scan.pickerRestoration?.reason!=='picker-already-closed'||scan.dnsForwarding?.state!=='closed')throw new Error('Scan partial acceptance/cleanup mismatch');
if(scanLayout.installedArtifactSha256!==verifiedAPK||scanLayout.sourceBefore?.sourceSha256!==verifiedSource||scanLayout.sourceAfter?.sourceSha256!==verifiedSource||!scanLayout.sourceUnchanged||
  scanLayout.results.length!==2||scanLayout.results.some(x=>x.geometryResult!=='通过')||
  [scanLayout.environmentRestoration,scanLayout.permissionRestoration,scanLayout.logout].some(x=>x?.result!=='通过')||scanLayout.dnsForwarding?.state!=='closed')throw new Error('Scan geometry/cleanup mismatch');
const newerSource='36acfca992ff83229bb6b2c92ad32e838dc1b42cbbadc9a3fa0a93c9662766b1';
if(newerUnit.totals.tests!==507||newerUnit.suites.length!==45||newerUnit.totals.failures!==0||newerUnit.totals.errors!==0||newerUnit.totals.skipped!==0||
  newerUnit.provenance.exitCode!==0||newerUnit.provenance.sourceBefore.sourceSha256!==newerSource||newerUnit.provenance.sourceAfter.sourceSha256!==newerSource||
  !newerUnit.provenance.sourceUnchangedDuringCheck||newerUnit.provenance.sourceAfter.sourceFiles!==302||
  newerUnit.suites.find(x=>x.name==='com.rowan.iot.EmailLoginServiceTest')?.tests!==27||
  newerUnit.suites.filter(x=>/Nickname/.test(x.name)).reduce((sum,x)=>sum+x.tests,0)!==30)throw new Error('Newer source-only unit evidence mismatch');
const roomTabsSource='14e1b3ed74a7f6d4444d3148dec511c4fec8cb19db9ebdf85f71977da5568180';
if(roomTabsUnit.totals.tests!==532||roomTabsUnit.suites.length!==47||roomTabsUnit.totals.failures!==0||roomTabsUnit.totals.errors!==0||roomTabsUnit.totals.skipped!==0||
  roomTabsUnit.provenance.exitCode!==0||roomTabsUnit.provenance.sourceBefore.sourceSha256!==roomTabsSource||roomTabsUnit.provenance.sourceAfter.sourceSha256!==roomTabsSource||
  !roomTabsUnit.provenance.sourceUnchangedDuringCheck||roomTabsUnit.provenance.sourceAfter.sourceFiles!==306||
  roomTabsUnit.suites.filter(x=>/HomeRoomTabsTest|HttpHomeRepositoryTest/.test(x.name)).reduce((sum,x)=>sum+x.tests,0)!==25)throw new Error('Room tabs source-only unit evidence mismatch');
if(preferencesUnit.totals.tests!==539||preferencesUnit.suites.length!==47||preferencesUnit.totals.failures!==0||preferencesUnit.totals.errors!==0||preferencesUnit.totals.skipped!==0||
  preferencesUnit.provenance.exitCode!==0||!preferencesUnit.provenance.sourceUnchangedDuringCheck||
  preferencesUnit.provenance.sourceBefore.sourceSha256!==preferencesSource||preferencesUnit.provenance.sourceAfter.sourceSha256!==preferencesSource||preferencesUnit.provenance.sourceAfter.sourceFiles!==306||
  preferencesUnit.suites.find(x=>x.name==='com.rowan.iot.AccountSettingsCommitTest')?.tests!==10||
  preferencesUnit.suites.find(x=>x.name==='com.rowan.iot.domain.preferences.PreferencesServiceTest')?.tests!==16)throw new Error('Preferences source-only unit evidence mismatch');
for(const [name,value,unchanged] of [['lint',preferencesLint,'sourceUnchangedDuringCheck'],['release',preferencesRelease,'sourceUnchangedDuringBuild']]) {
  if(value.sourceBefore?.sourceSha256!==preferencesSource||value.sourceAfter?.sourceSha256!==preferencesSource||!value[unchanged]||
    (name==='lint'?value.exitCode!==0:value.artifactSha256!==candidateAPK))throw new Error(`Candidate ${name} evidence mismatch`);
}
for(const file of ['android-account-home-preferences-lint.log','android-account-home-preferences-release.log'])
  if(!readFileSync(new URL(report+file,root),'utf8').includes('BUILD SUCCESSFUL'))throw new Error(`Candidate check not successful: ${file}`);
for(const path of [iosEvidence,iosLoginEvidence,roomTabsEvidence])if(!existsSync(new URL(path,root)))throw new Error(`Evidence missing: ${path}`);
// Later facts are kept separate from the b8e/5d scan artifact above. A passing source
// test suite never retrospectively changes either APK's implementation or UI result.
const finalEmulatorEvidence='android-emulator-2026-11-01T19-08-53.705Z.json';
const finalEnvironmentEvidence='android-account-home-environment-final.json';
const publicLoginEvidence='android-email-login-public-2026-11-01T18-50-48.743Z.json';
const roomTabsUIEvidence='android-home-room-tabs-2026-11-01T19-02-48.278Z.json';
const entryOnlyEvidence='android-emulator-2026-11-01T18-58-13.658Z.json';
const logoutContinuationEvidence='android-native-readonly-2026-11-01T19-04-57.125Z.json';
const finalHTTPEvidence='http-service-2026-11-01T19-15-31.712Z.json';
const selectionUnitEvidence='android-unit-2026-11-01T19-24-59.467Z/summary.json';
const presentationUnitEvidence='android-unit-2026-11-01T19-28-00.310Z/summary.json';
const finalEmulator=read(report+finalEmulatorEvidence),finalEnvironment=read(report+finalEnvironmentEvidence);
const publicLogin=read(report+publicLoginEvidence),roomTabsUI=read(report+roomTabsUIEvidence);
const entryOnly=read(report+entryOnlyEvidence),logoutContinuation=read(report+logoutContinuationEvidence),finalHTTP=read(report+finalHTTPEvidence);
const selectionUnit=read(report+selectionUnitEvidence),presentationUnit=read(report+presentationUnitEvidence);
const counts=(value,result)=>value.results.filter(x=>x.result===result).length;
if(finalEmulator.installedArtifactSha256!==candidateAPK||finalEmulator.sourceSha256!==preferencesSource||finalEmulator.sourceFiles!==306||
  !finalEmulator.installedArtifactMatchesBuild||finalEmulator.buildProvenance?.artifactSha256!==candidateAPK||
  finalEmulator.buildProvenance?.sourceBefore?.sourceSha256!==preferencesSource||finalEmulator.buildProvenance?.sourceAfter?.sourceSha256!==preferencesSource||
  !finalEmulator.buildProvenance?.sourceUnchangedDuringBuild||counts(finalEmulator,'通过')!==25||counts(finalEmulator,'阻塞')!==2||finalEmulator.results.length!==27||
  finalEmulator.sessionKept!==false||finalEmulator.dnsForwarding?.state!=='closed'||finalEmulator.results.find(x=>x.id==='AUTH-06-native-emulator')?.result!=='通过')
  throw new Error('Final c08d emulator/cleanup provenance mismatch');
if(finalEnvironment.artifactSha256!==candidateAPK||finalEnvironment.source?.sourceSha256!==preferencesSource||finalEnvironment.serial!=='emulator-5554')throw new Error('Final environment mismatch');
for(const value of [publicLogin,roomTabsUI])if(value.installedArtifactSha256!==candidateAPK||value.sourceBefore?.sourceSha256!==preferencesSource||value.sourceAfter?.sourceSha256!==preferencesSource||!value.sourceUnchanged)
  throw new Error('Public UI artifact/source mismatch');
if(publicLogin.results.length!==25||counts(publicLogin,'通过')!==25||publicLogin.sendActions!==0||publicLogin.submitActions!==0||publicLogin.cleanup!=='welcome-confirmed')throw new Error('S016 public UI mismatch');
if(roomTabsUI.results.length!==5||counts(roomTabsUI,'通过')!==3||counts(roomTabsUI,'未验收')!==2||roomTabsUI.roomCount!==0||
  roomTabsUI.results.find(x=>x.id==='all-retained-after-refresh')?.reason!=='REFRESH_LOADING_WINDOW_NOT_OBSERVED'||
  roomTabsUI.results.find(x=>x.id==='real-room-selection')?.reason!=='NO_SERVER_ROOM_TABS'||roomTabsUI.roomWriteActions!==0||roomTabsUI.logoutActions!==0||
  roomTabsUI.cleanup!=='all-confirmed-session-retained'||roomTabsUI.dnsForwarding?.state!=='closed')throw new Error('Room-tab UI partial coverage mismatch');
if(entryOnly.installedArtifactSha256!==candidateAPK||entryOnly.sourceSha256!==preferencesSource||counts(entryOnly,'通过')!==12||entryOnly.results.length!==12||entryOnly.sessionKept!==true||entryOnly.dnsForwarding?.state!=='closed'||
  logoutContinuation.installedArtifactSha256!==candidateAPK||logoutContinuation.parentRunId!==entryOnly.runId||logoutContinuation.results.find(x=>x.id==='AUTH-06-native-logout-continuation')?.result!=='通过'||logoutContinuation.dnsForwarding?.state!=='closed')throw new Error('Entry-only/normal logout layers mismatch');
for(const kind of ['mcu','wifi'])if(finalHTTP.results.find(x=>x.id===`OTA-${kind}-defined-shape`)?.firmwareType!=='null')throw new Error('Latest firmware null evidence mismatch');
for(const [value,tests,suites,source,files] of [[selectionUnit,596,52,'3c9c8042d30bcef16b537213513dc9149828194ad51c6ca3cdc604e153e723a7',317],
  [presentationUnit,620,53,'8461b4cad4038a170c9057dcab738f0e2e7f73ea777cdeedb1f17e7df2477e17',319]]) {
  if(value.totals.tests!==tests||value.suites.length!==suites||value.totals.failures!==0||value.totals.errors!==0||value.totals.skipped!==0||value.provenance.exitCode!==0||
    !value.provenance.sourceUnchangedDuringCheck||value.provenance.sourceBefore?.sourceSha256!==source||value.provenance.sourceAfter?.sourceSha256!==source||value.provenance.sourceAfter?.sourceFiles!==files)
    throw new Error('Later source-only JVM evidence mismatch');
}
if(presentationUnit.suites.find(x=>x.name==='com.rowan.iot.domain.presentation.PresentationOwnerTest')?.tests!==24||
  selectionUnit.suites.find(x=>x.name==='com.rowan.iot.domain.home.HomeSelectionTest')?.tests!==21||
  selectionUnit.suites.find(x=>x.name==='com.rowan.iot.features.home.HomeActionControlsTest')?.tests!==6||
  selectionUnit.suites.filter(x=>/SelfUnbind/.test(x.name)).reduce((sum,x)=>sum+x.tests,0)!==30)throw new Error('New core suite counts mismatch');
const nativeStarted=new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,33,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,85,97,98,99,100,101,102,103,104]);
for(const id of [31,32,96])nativeStarted.add(id);
for(const id of [35,36,42,43,44,45,105,106,107,108,109,110,111])nativeStarted.add(id);
for(let id=74;id<=83;id++)nativeStarted.add(id);
for(let id=91;id<=95;id++)nativeStarted.add(id);
for(const id of [84,86,90])nativeStarted.add(id);
// Verified APK includes scan software; five software subchecks passed, not live-camera/production binding.
for(const id of [37,38,39,40])nativeStarted.add(id);
const rnStarted=new Set([1,30,61,62,64,65,66,68,69,71,72]);
for(const id of [74,91,92])rnStarted.add(id);
for(const id of [84,85,86,90])rnStarted.add(id);
const current={
  1:'独立RN、双端宿主及major3页面实例关闭/只读桥接已有源码；最终Android包的内置RN、导航、关闭及真实原生MQTT快照通过，使用显式真实DNS转发；iOS未编译。',
  2:'品牌启动与原生入口已有源码；有/无会话正常入口已在新包验证，异常/屏幕状态尚未全覆盖。',
  3:'正常冷恢复通过；旧会话隔离已有离线测试，网络失败与取消等完整模拟器回归待补。',
  4:'全屏地区选择已有源码；密码框拉高缺陷修复后，模拟器选择美国并返回注册页通过，完整视觉尚未验收。',
  5:'本地ISO地区搜索已有源码；模拟器精确US搜索与选择返回通过，完整异常与各语言尚未验收。',
  6:'原生纯文本阅读器及前台60秒/底部门禁；真实CONTENT-01失败，正文闭环阻塞。',
  7:'原生纯文本阅读器及前台60秒/底部门禁；真实CONTENT-02失败，正文闭环阻塞。',
  8:'阅读与同意门禁已有源码/离线测试；真实正文不可用；版本提交按用户确认等待后端契约。',
  14:'按V1.4已定义字段提交并接受返回会话；协议版本参数缺失已确认阻塞，未真实注册。',
  15:'实际邮箱密码登录正常链路通过；不是全部异常场景或视觉验收通过。',
  16:'Android S016有27项JVM回归；c08d/0e254d公开UI25子项实际通过且0send/0submit，未SMTP或真实验证码登录联调。截图发现UI-LOGIN-OTP-001：验证码误带闭眼装饰，单行源码已修，但无新APK复测；iOS对应定义未执行。',
  17:'原生安全存储及完整会话字段已实现，正常冷恢复通过；故障与取消边界仍在补测。',
  22:'Android实际正常退出通过；取消/401/本地删除失败已有JVM回归。iOS已同步后台存储/事务清理源码及测试定义，尚未编译运行。',
  26:'双端S026正式源码已应用，Android25项域/仓库用例实际通过。c08d房间公开UI3PASS+2未验收：无真实房间tab、未观察刷新loading，不能声称真实房间切换或刷新保留通过；iOS仅静态定义。',
  30:'真实HOME设备可进入内置RN只读状态页面；桥接观察、取消、重同步及ACK已有测试，不是完整设备控制验收通过。',
  31:'双端本地多选核心及原生Home UI源码已正式应用；Android21选择+6退出按钮调度定义随596/52实际JVM通过，iOS21定义未执行。尚无包含本批的新APK/UI验证。',
  32:'本地确认核对与默认拒绝移除已正式应用；UI明确暂不可用，无逐台DELETE、汇总成功或执行闭环。需要S096生产执行/撤权清理接线，不能把defaultdeny当批量删除已完成。',
  96:'双端self-unbind业务/HTTP/journal核心已正式应用，Android30项随596/52实际JVM通过；无生产许可发行/DI/桥接/页面完整接线，无真实DELETE或关系变更。iOS仅源码/静态，不声称完整解绑通过。',
  35:'双端Mine仅设置/退出明确入口已有源码；Android实际进入设置与退出通过，未冻结的额外Mine内容未扩展。',
  36:'c08d专项原生Add扫码/手动sheet及产品目录只读入口通过；拒绝相机权限、相册公开三图及五软件子项仅为b8e/5d历史包证据，未在c08d复测。配网/生产码绑定未完成。',
  37:'Android扫码平台驱动/页面/资源门在历史已安装b8e包内；17:27:42实际拒绝相机权限+相册入口与返回通过。17:48:40小屏/150%字号两配置布局几何/滚动可达通过，不代表pixel/蓝湖视觉；真实相机帧解码、全状态及iOS运行仍未验收。',
  38:'17:27:42实际系统PhotoPicker→原生解码：公开normal/blank/multiple三图分别得到unsupported/no-code/multiple-codes，五个软件子项通过。media3/权限恢复/正常退出通过；picker已关闭故恢复不适用。该证据替代17:12图库定位阻塞，但不证明真实相机帧、生产码解释/绑定或完整S038验收；iOS未运行。',
  39:'生产二维码编码未冻结；Android拒绝未知码的软件实现及消费者编译/450项全量单测通过，不解析或伪造deviceId/productId/bindCode，真实平台与业务仍未验收。',
  40:'Android本地unsupported/多码/资源预算实现及消费者编译/450项全量单测通过；真实格式、过期、不存在/权限业务闭环未验收，不以unknown码推导云端错误。',
  41:'生产码解释与单次消费契约仍阻塞；没有真实扫码绑定、自动PAIR-06重放、绑定成功或昵称闭环验收。',
  42:'双端产品分类服务和页面已有源码，Android实际PAIR-03目录加载通过；完整分类切换与视觉未验收。',
  43:'双端手动产品列表已有源码，最终Android包实际PAIR-01目录及返回栈通过；图片加载与完整视觉未验收。',
  44:'双端推荐/排序解析与离线测试已有实现，实际目录返回推荐与排序字段；完整推荐UI尚未验收。',
  45:'双端PAIR-02详情已有源码；最终Android包实际产品文本详情与返回通过，未点击Shop/图片或进行配网绑定，视觉未验收。',
  59:'实际服务DEVICE-01/02及THING-01形状已取得；Android已按HOME归属授权加载真实设备元数据。通用模型解析/严格约束已有测试，尚未注册全产品写映射。',
  60:'Node/JVM与Android真实原生只读云端快照通过；模拟器需显式真实DNS转发环境，普通UDP路径未证明修复。断网、到期、权限变化完整回归未做，iOS broker未接入。',
  74:'原生定时仓库与只读RN列表已接线；新包实际TIMER读取空数组、空态及返回通过，非空/写操作及完整视觉未验收。',
  91:'MCU只读页已接线且实际错误态可返回；真实接口firmware:null缺候选ID/version，契约阻塞，不推导最新版。',
  92:'Wi-Fi只读页已接线且切换/错误态可返回；真实接口firmware:null缺候选ID/version，候选读取阻塞。',
  85:'双端房间移动数据服务已有源码；最终Android包RN更多只读归属呈现unknown及返回通过，未能确认assigned/unassigned，未真实移动。',
  84:'c08d/0e254d最终专项真实设备元数据/更多摘要及major3关闭通过。昵称基础/journal30项已正式源码并通过JVM，生产许可/页面保存仍未接；iOS仅定义，无真实修改或昵称闭环验收。',
  86:'最终Android包真实成员安全摘要loaded及返回通过；不传联系方式/用户ID，不含成员移除/自解绑，完整状态与视觉未验收。',
  90:'最终Android包真实type=text空帮助及返回通过；普通文本无URL打开，不代表非空帮助或全部状态验收。',
  101:'仅明确非默认且空房间允许删除；非空/默认/属性未知删除待契约，未真实删除。',
  102:'最新GET对比编辑基线→PUT定义字段→GET复核；服务端CAS字段未冻结，GET/PUT竞态未解决。',
  103:'移动数据服务已有源码；RN更多仅只读房间unknown与返回通过，选择/保存及真实设备移动仍未联调。',
  104:'双端完整设置读取/严格投影/原子账号缓存及原生页面已有实现；Android真实GET通过，未知/失败/多屏完整UI未验收。',
  105:'原生三语言选项及typed PATCH已实现，Android选项核对通过；全App/RN资源刷新尚未完成，未实际切换语言。',
  106:'原生云通知偏好与系统权限分开展示；Android展示检查通过，没有改变通知偏好、请求系统权限或验证推送。',
  107:'theme保存/回读/缓存及设置页配色已实现，Android真实切深色后恢复原system通过；全App/RN主题仍未完成。',
  108:'读取壁纸对象与typed字符串ID PATCH基础已有；展示真实当前状态，没有权威目录，选择器阻塞，不造ID。',
  109:'保留真实布局字符串但不显示wire ID；布局枚举/目录未冻结，选择器阻塞，不造layout1等选项。',
  110:'C/F独立typed PATCH及原生选项已实现，Android选项核对通过；未改单位、统一首页/RN显示或验证设备写值换算。',
  111:'metric/imperial独立typed PATCH及选项已实现，Android选项核对通过；未改偏好，不造跨字段组合矩阵。',
};
for(const id of [104,105,106,107,108,109,110,111])current[id]+=' 后续双端源码已实现共享整段设置事务gate/共享unknown状态和settings-publication CAS；新增Android7项随539/47实际JVM通过，iOS7项仅定义。新增只读PresentationOwner核心双端24定义已正式应用，Android24项随620/53实际JVM通过，iOS仅静态；全App/RN展示UI和桥接尚未接线，不把核心通过当整行验收。';
// SDK fixture consumer compilation and partial runtime remain separate from full public UI acceptance.
const fixtureSource='f24946de1730d0cda3731df136f56c9b1b3fc5816df4661e16a8a2e784821312';
const fixtureAPK='ef3043ea0ccac32a6dea78e6b308cbcc28c047bb6c97b606444294663b52f549';
const fixtureTestAPK='0cf2f2f91c6b93cbdb8fad30c2212457ba26c692a28db7ab6c947c77bb8478f1';
const fixtureUnitEvidence='android-unit-2026-11-01T19-58-25.333Z/summary.json';
const otpVisualEvidence='android-email-login-public-2026-11-01T20-09-55.932Z.json';
const fixtureInitialEvidence='android-home-ui-fixtures-initial-systemui-blocked-baa9df10-2708-4c2c-9d95-01f06fc359f0/report.json';
const fixtureRetryEvidence='android-home-ui-fixtures-retry-partial-failed-aedbf057-b5ec-4728-872a-33caaa19f69f/report.json';
const fixtureUnit=read(report+fixtureUnitEvidence),otpVisual=read(report+otpVisualEvidence);
const fixtureInitial=read(report+fixtureInitialEvidence),fixtureRetry=read(report+fixtureRetryEvidence);
const fixtureProvenanceEvidence=['android-home-fixtures-release-lint-provenance.json','android-home-fixtures-host-provenance.json','android-home-fixtures-test-provenance.json'];
const fixtureProvenance=fixtureProvenanceEvidence.map(path=>read(report+path));
if(fixtureUnit.totals.tests!==620||fixtureUnit.suites.length!==53||fixtureUnit.totals.failures!==0||fixtureUnit.totals.errors!==0||fixtureUnit.totals.skipped!==0||fixtureUnit.provenance.exitCode!==0||
 !fixtureUnit.provenance.sourceUnchangedDuringCheck||fixtureUnit.provenance.sourceBefore.sourceSha256!==fixtureSource||fixtureUnit.provenance.sourceAfter.sourceSha256!==fixtureSource||fixtureUnit.provenance.sourceAfter.sourceFiles!==323)throw Error('SDK fixture source unit mismatch');
for(const [i,value]of fixtureProvenance.entries())if(value.sourceBefore?.sourceSha256!==fixtureSource||value.sourceAfter?.sourceSha256!==fixtureSource||value.sourceAfter.sourceFiles!==323||
 !(i===0?value.sourceUnchangedDuringCheck&&value.exitCode===0:value.sourceUnchangedDuringBuild&&value.artifactSha256===(i===1?fixtureAPK:fixtureTestAPK))||
 (i===2&&value.targetArtifactSha256!==fixtureAPK))throw Error('SDK fixture compile provenance mismatch');
if(otpVisual.installedArtifactSha256!==fixtureAPK||!otpVisual.sourceUnchanged||otpVisual.sourceBefore.sourceSha256!==fixtureSource||otpVisual.sourceAfter.sourceSha256!==fixtureSource||
 !otpVisual.visualOnly||otpVisual.results.length!==4||otpVisual.results.some(x=>x.result!=='通过')||otpVisual.sendActions!==0||otpVisual.submitActions!==0||otpVisual.cleanup!=='welcome-confirmed')throw Error('OTP visual follow-up mismatch');
for(const value of [fixtureInitial,fixtureRetry])if(!value.fixtureOnly||value.businessHttpDelegate!=='none'||value.realHttpAcceptance!==false||value.pixelAcceptance!==false||value.targetApkSha256!==fixtureAPK||value.testApkSha256!==fixtureTestAPK)throw Error('Fixture runtime artifact mismatch');
if(fixtureInitial.artifacts.length!==0||fixtureInitial.results.find(x=>x.id==='empty-home')?.result!=='failed'||
 fixtureRetry.results.find(x=>x.id==='empty-home')?.result!=='passed'||fixtureRetry.results.find(x=>x.id==='multiple-rooms-same-name-and-opaque-id')?.result!=='failed'||
 fixtureRetry.artifacts.length!==1||fixtureRetry.artifacts[0].name!=='00-empty-home.png'||fixtureRetry.artifacts[0].geometryResult!=='passed')throw Error('Fixture partial outcome mismatch');
current[16]+=' 后续f249/ef3043新包已实际完成4项OTP公开视觉复测，0send/0submit；闭眼装饰修复已新包复测，不等于真实验证码登录或完整像素验收。';
current[26]+=' 后续f249/ef3043真实SDK instrumentation：首run系统UI遮挡阻塞；同包retry仅empty-home真实帧/几何/截图通过，下一多房间同名opaque ID场景失败，完整矩阵未通过。';
const matrixEvidence='android-home-ui-matrix-ff33f717-095e-475c-9aa6-cdda64862efb/archive-index.json';
const manualBaseEvidence='android-home-ui-fixtures-base-passed-3c03f364-b68d-4eac-ad55-5d38df16cbe7/report.json';
const currentUnitEvidence='android-unit-2026-11-01T20-28-06.944Z/summary.json';
const currentEmulatorEvidence='android-emulator-2026-11-01T20-46-00.563Z.json';
const currentSource='725e3f9a235c21f5cc5c40239fc34be683c1e9a46a1a900280e23da6ae0d6251';
const currentAPK='3fc9e74af7eb253cc7d150701cfe3aa6d82ae93615855fd308ee311c8b3f1197';
const currentTestAPK='0d39c88a6156492fd7a5ace794b64f473aae37549b5a077dd564b766bdbc0648';
const matrix=read(report+matrixEvidence),manualBase=read(report+manualBaseEvidence),currentUnit=read(report+currentUnitEvidence),currentEmulator=read(report+currentEmulatorEvidence);
const currentBuildEvidence=['self-unbind-integration-lint-provenance.json','self-unbind-integration-release-provenance.json','self-unbind-integration-androidtest-provenance.json'];
for(const [i,path]of currentBuildEvidence.entries()){
 const value=read(report+path);if(value.sourceBefore?.sourceSha256!==currentSource||value.sourceAfter?.sourceSha256!==currentSource||value.sourceAfter.sourceFiles!==326||
 !(i===0?value.exitCode===0&&value.sourceUnchangedDuringCheck:value.sourceUnchangedDuringBuild&&value.artifactSha256===(i===1?currentAPK:currentTestAPK))||
 (i===2&&value.targetArtifactSha256!==currentAPK))throw Error('Latest source/build mismatch');
}
if(currentUnit.totals.tests!==643||currentUnit.suites.length!==54||currentUnit.totals.failures!==0||currentUnit.totals.errors!==0||currentUnit.totals.skipped!==0||
 currentUnit.provenance.exitCode!==0||!currentUnit.provenance.sourceUnchangedDuringCheck||currentUnit.provenance.sourceBefore.sourceSha256!==currentSource||currentUnit.provenance.sourceAfter.sourceSha256!==currentSource)throw Error('Current 643 JVM mismatch');
if(currentEmulator.installedArtifactSha256!==currentAPK||!currentEmulator.installedArtifactMatchesBuild||currentEmulator.sourceSha256!==currentSource||currentEmulator.sourceFiles!==326||
 currentEmulator.buildProvenance?.artifactSha256!==currentAPK||currentEmulator.buildProvenance?.sourceAfter?.sourceSha256!==currentSource||!currentEmulator.buildProvenance?.sourceUnchangedDuringBuild||
 counts(currentEmulator,'通过')!==25||counts(currentEmulator,'阻塞')!==2||currentEmulator.results.length!==27||currentEmulator.sessionKept!==false||currentEmulator.dnsForwarding?.state!=='closed'||
 currentEmulator.results.find(x=>x.id==='AUTH-06-native-emulator')?.result!=='通过')throw Error('Current actual main run mismatch');
if(matrix.status!=='通过'||!matrix.fixtureOnly||matrix.realHttpAcceptance!==false||matrix.pixelAcceptance!==false||matrix.sourceSha256!==currentSource||matrix.hostSha256!==currentAPK||matrix.testSha256!==currentTestAPK||
 matrix.configurations.length!==4||matrix.restoration?.result!=='passed'||matrix.configurations.some(x=>x.status!=='通过'||x.passed!==9||x.screenshots.length!==10)||new Set(matrix.configurations.map(x=>x.configuration.id)).size!==4)throw Error('Actual controlled UI matrix mismatch');
for(const c of matrix.configurations){const child=read(report+c.report);if(child.targetApkSha256!==currentAPK||child.testApkSha256!==currentTestAPK||child.results.length!==9||child.results.some(x=>x.result!=='passed')||child.artifacts.length!==10)throw Error('Matrix child mismatch');}
if(manualBase.targetApkSha256!==currentAPK||manualBase.testApkSha256!==currentTestAPK||manualBase.results.length!==9||manualBase.results.some(x=>x.result!=='passed')||manualBase.artifacts.length!==10)throw Error('Manual base mismatch');
current[26]+=' 后续725e/3fc9受控SDK矩阵四配置36场景/40图及独立手动base9场景实际通过，精确恢复；这是公开fixture真实Home UI，不是服务器多房间数据/完整像素验收，早期失败保历史。';
current[31]+=' 后续725e/3fc9真实fixture矩阵四配置已覆盖长按多选/勾选/取消/返回，局部UI通过；不是批量删除授权。';
const currentDirectHTTPEvidence='http-service-2026-11-01T20-50-41.485Z.json';
const currentDirectHTTP=read(report+currentDirectHTTPEvidence);
for(const kind of ['mcu','wifi']){const value=currentDirectHTTP.results.find(x=>x.id===`OTA-${kind}-defined-shape`);
 if(value?.firmwareType!=='null'||value.firmwareFieldPresent!==true||value.deviceIdMatches!==true)throw Error('Latest direct firmware null mismatch');}
if(currentDirectHTTP.results.find(x=>x.id==='TIMER-01-defined-shape')?.count!==0||currentDirectHTTP.results.find(x=>x.id==='TIMER-01-defined-shape')?.isArray!==true||
 currentDirectHTTP.results.find(x=>x.id==='AUTH-06')?.result!=='通过'||currentDirectHTTP.results.find(x=>x.id==='CONTENT-01')?.businessCode!==1002030000||
 currentDirectHTTP.results.find(x=>x.id==='CONTENT-02')?.businessCode!==1002030001||JSON.stringify(currentDirectHTTP.contentQuery)!==JSON.stringify({type:'text'}))throw Error('Latest direct HTTP limitations mismatch');
current[91]+=' 最新20:50独立HTTP再次确认mcu firmware字段存在且null、deviceID匹配；App错误态与该契约缺口关联，不推导无更新。';
current[92]+=' 最新20:50独立HTTP再次确认wifi firmware字段存在且null、deviceID匹配；App错误态与该契约缺口关联，不推导无更新。';
const partialEvidence={
  16:[iosLoginEvidence,androidLoginEvidence,otpVisualEvidence],
  26:[matrixEvidence,manualBaseEvidence,roomTabsEvidence,roomTabsUnitEvidence,fixtureInitialEvidence,fixtureRetryEvidence,'ios-as/Rowan/Domain/Device/HomeRepository.swift'],
  1:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  2:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  3:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  4:['android-auth-public-2026-11-01T10-33-59.836Z.json'],
  5:['android-auth-public-2026-11-01T10-33-59.836Z.json'],
  36:['android-native-readonly-2026-11-01T10-32-04.152Z.json'],
  42:['android-native-readonly-2026-11-01T10-32-04.152Z.json'],
  43:['android-native-readonly-2026-11-01T10-32-04.152Z.json'],
  44:['http-service-2026-11-01T09-19-08.469Z.json'],
  45:['android-native-readonly-2026-11-01T10-32-04.152Z.json'],
  6:['http-authenticated-service-probe.json'],7:['http-authenticated-service-probe.json'],
  15:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  17:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  22:['android-emulator-2026-11-01T09-06-50.552Z.json'],
  30:['android-emulator-2026-11-01T11-30-25.791Z.json'],
  59:['http-service-2026-11-01T08-56-27.593Z.json'],
  60:['mqtt-readonly-2026-11-01T11-24-08.839Z.json','paho-jvm-readonly-2026-11-01T11-29-00.094Z.json','android-emulator-2026-11-01T11-30-25.791Z.json','android-emulator-2026-11-01T12-33-06.557Z.json'],
};
for(const id of [35,104,105,106,107,108,109,110,111])partialEvidence[id]=['android-preferences-2026-11-01T12-35-32.932Z.json'];
for(const id of [74,91,92])partialEvidence[id]=['android-unit-2026-11-01T13-43-39.050Z/summary.json','rn-device-readonly-summary.json','android-emulator-2026-11-01T13-57-15.088Z.json','http-service-2026-11-01T14-00-06.774Z.json'];
for(const id of [84,85,86,90])partialEvidence[id]=['android-unit-2026-11-01T15-04-55.361Z/summary.json','rn-native-page-close-summary.json','http-service-2026-11-01T14-13-20.485Z.json'];
for(const id of [1,2,3,15,17,22,30,36,42,43,45,59,60,74,84,85,86,90,91,92,97])
  partialEvidence[id]=[...new Set([...(partialEvidence[id]??[]),latestEmulator])];
for(const id of [1,30,74,84,85,86,90,91,92])
  partialEvidence[id]=[...new Set([...(partialEvidence[id]??[]),latestUnit,latestRN])];
partialEvidence[84]=[...(partialEvidence[84]??[]),iosEvidence,newerUnitEvidence];
for(const id of [104,105,106,107,108,109,110,111])partialEvidence[id]=[...(partialEvidence[id]??[]),preferencesUnitEvidence];
for(const id of [37,38])partialEvidence[id]=[...(partialEvidence[id]??[]),scanLayoutEvidence];
for(const id of [36,37,38,39,40])partialEvidence[id]=[...(partialEvidence[id]??[]),scanEvidence];
for(const id of [1,2,3,15,17,22,30,36,42,43,45,59,60,74,84,85,86,90,91,92,97])
  partialEvidence[id]=[...(partialEvidence[id]??[]),finalEmulatorEvidence];
partialEvidence[16]=[...(partialEvidence[16]??[]),publicLoginEvidence];
partialEvidence[26]=[...(partialEvidence[26]??[]),roomTabsUIEvidence];
for(const id of [1,2,3,15,17,22,36,42,43,45,97])partialEvidence[id]=[...(partialEvidence[id]??[]),entryOnlyEvidence,logoutContinuationEvidence];
for(const id of [6,7,59,60,74,91,92])partialEvidence[id]=[...(partialEvidence[id]??[]),finalHTTPEvidence];
for(const id of [31,32])partialEvidence[id]=[selectionUnitEvidence,'home-selection-implementation-application.json'];
partialEvidence[96]=[selectionUnitEvidence,'self-unbind-implementation-application.json'];
for(const id of [32,87,88,89,96])partialEvidence[id]=[...(partialEvidence[id]??[]),'真实关系变更联调阻塞-20261102.md'];
for(const id of [105,107,110,111])partialEvidence[id]=[...(partialEvidence[id]??[]),presentationUnitEvidence,'presentation-owner-implementation-application.json'];
current[96]+=' 后续正式双端/RN确认入口与授权隔离已应用；原生持有确认和执行任务，取消不重放请求，旧关系撤权后须重新授权；Android691/57、RN116通过，iOS754仅定义。本批新APK的运行证据单列，真实解绑因缺第二账号和隔离设备阻塞。';
current[87]+=' 后续双端新增原生SHARE-01协议适配，生成GET显式禁止账号刷新重放，校验响应设备ID及临时绑定码；Android新增10项随701/58实际通过，iOS10仅定义。尚未接入管理员/观察/页面任务所有权及RN生成入口，不是完整分享实现；生产二维码格式和有效期字段尚缺，真实生成联调阻塞。';
partialEvidence[87]=[...(partialEvidence[87]??[]),'分享码原生协议适配-20261102.md'];
for(const id of [32,96])partialEvidence[id]=[...(partialEvidence[id]??[]),'自解绑确认与授权隔离-20261102.md','真实关系变更联调阻塞-20261102.md'];
const items=mapping.items.map(item=>{
  const n=Number(item.id.slice(1));
  const implementation=Object.fromEntries(item.platforms.map(platform=>[platform,(platform==='共享RN'?rnStarted:nativeStarted).has(n)?'进行中':'未开始']));
  if(n===16&&implementation.iOS)implementation.iOS='进行中';
  const blockers=[];
  const relationshipWriteBlocked=[32,87,88,89,96].includes(n);
  if(relationshipWriteBlocked)blockers.push('用户确认暂无第二专用测试账号与可恢复隔离设备；成员移除、分享绑定、自解绑及其批量执行的真实写联调阻塞，受控实现/UI验证不替代真实闭环');
  if([6,7,8,14].includes(n))blockers.push('真实协议正文未取得');
  if([8,14].includes(n))blockers.push('协议版本获取/提交契约缺失；用户确认先实现V1.4已定义字段');
  if([101,102].includes(n))blockers.push(n===101?'默认/非空房间删除与设备迁移规则待补齐':'服务端原子CAS契约未冻结；不能由客户端GET对比消除竞态');
  if([108,109].includes(n))blockers.push(n===108?'权威壁纸可选目录/资源契约缺失':'首页布局合法枚举/可选目录未冻结');
  if([91,92].includes(n))blockers.push('真实候选查询firmware:null；V1.4未明确null语义，不能当最新版或虚构固件');
  if([39,40,41].includes(n))blockers.push('生产二维码格式/过期/绑定契约未冻结；不得套用开发编码或虚构绑定成功');
  if([87,88].includes(n))blockers.push('V1.4未冻结生产分享二维码编码结构/版本取值，SHARE-01无expiresAt/有效秒数字段；不臆造编码或倒计时，原生协议适配单独实现');
  if((n>=61&&n<=69)||n===71||n===78)blockers.push('缺少生产产品定版字段/动作字典；用户确认暂无补充资料，保留阻塞，不套用开发测试映射');
  return {id:item.id,title:item.title,sourceRow:item.sourceRow,platforms:item.platforms,implementation,
    acceptance:{androidUI:'未验收',androidEmulator:'未验收',http:relationshipWriteBlocked?'阻塞':'未验收',nativeMQTT:'未验收',iosBuild:'未验收',iosRuntime:'未验收',hardware:'未验收'},
    note:current[n]??(nativeStarted.has(n)?'已有部分服务/页面/纯状态核心源码，尚未完成本条全部要求与适用验收。':'尚未实现本条完整业务；来源和预期用例见逐项映射。'),
    blockers,partialEvidence:(partialEvidence[n]??[]).map(name=>name.startsWith('docs/')||name.startsWith('ios-as/')?name:report+name),
    cases:item.acceptanceScenarios.map(test=>({id:test.id,scenario:test.scenario,status:'未验收',evidence:[]}))};
});
for(const item of items)for(const path of item.partialEvidence)if(!existsSync(new URL(path,root)))throw new Error(`Evidence missing: ${path}`);
if(items.length!==111||new Set(items.map(x=>x.id)).size!==111)throw new Error('Incomplete scope overlay');
const latestVerification={
  androidEmulator:{evidence:report+latestEmulator,passed,blocked,sessionKept:true,logout:'主run保留会话；正常退出见androidScan子run',dnsForwarding:'closed'},
  androidUnit:{evidence:report+latestUnit,tests:450,suites:41,failures:0,errors:0,skipped:0,sourceSha256:verifiedSource,relation:'历史已安装APK的同源码检查'},
  androidNewerSourceUnit:{evidence:report+newerUnitEvidence,tests:507,suites:45,failures:0,errors:0,skipped:0,sourceSha256:newerSource,sourceFiles:302,relation:'后续S016/昵称源码检查；未安装，不覆盖历史APK验证'},
  androidRoomTabsUnit:{evidence:report+roomTabsUnitEvidence,tests:532,suites:47,failures:0,errors:0,skipped:0,sourceSha256:roomTabsSource,sourceFiles:306,relation:'包含S026后续源码检查；未安装，未借用旧APK验收'},
  androidPreferencesUnit:{evidence:report+preferencesUnitEvidence,tests:539,suites:47,failures:0,errors:0,skipped:0,sourceSha256:preferencesSource,sourceFiles:306,relation:'c08d已运行APK同源码shared gate/CAS检查，后续核心源码未包含在该APK'},
  androidCandidateLint:{evidence:report+preferencesLintEvidence,log:report+'android-account-home-preferences-lint.log',errors:0,warnings:27,result:'通过',sourceSha256:preferencesSource},
  androidCandidateRelease:{evidence:report+preferencesReleaseEvidence,log:report+'android-account-home-preferences-release.log',result:'通过',artifactSha256:candidateAPK,sourceSha256:preferencesSource,sourceFiles:306,installation:'Root报告已安装；当前公开UI流程未结束、未整轮验收，未升级latestVerifiedAndroidAPK'},
  preferencesSharedGate:{evidence:report+preferencesUnitEvidence,androidNewTestsPassed:7,ios:{evidence:'ios-as/Tests/Unit/PreferencesServiceTests.swift',cas:{evidence:'ios-as/Tests/Unit/AccountSettingsCommitTests.swift'},newTestDefinitions:7,execution:'仅定义，未Swift/XCTest执行'},implementation:'双端共享事务gate/unknown及settings publication CAS源码已实现',globalPresentation:'未完成'},
  rn:{evidence:report+latestRN,tests:100,files:11,lint:'通过',typecheck:'通过',codegen:'通过',bridgeMajor:3},
  more:{evidence:report+latestEmulator,summary:'通过',members:'通过：loaded',help:'通过：empty',location:'仅unknown态通过，不确认分配'},
  androidLint:{evidence:report+lintEvidence,log:report+'android-scan-final-lint.log',errors:0,warnings:26,result:'通过'},
  androidRelease:{evidence:report+releaseEvidence,log:report+'android-scan-release.log',result:'通过',artifactSha256:verifiedAPK},
  ios:{evidence:iosEvidence,unitDefinitions:677,definitionBasis:'正式源Root静态计数；含S03121/S09630/展示24，未执行',execution:'未Swift/XCTest/macOS执行',S016:{evidence:iosLoginEvidence,newTestDefinitions:29,smtp:'未联调'},roomTabs:{evidence:'ios-as/Tests/Unit/HomeAndAccountTests.swift',newTestDefinitions:26,execution:'仅定义，未Swift/XCTest执行'}},
  androidS016:{evidence:report+newerUnitEvidence,tests:27,status:'27项JVM通过；公开UI25子项通过，未SMTP或真实验证码联调'},
  nativeRoomTabs:{evidence:report+roomTabsUnitEvidence,androidTestsPassed:25,iosTestDefinitions:26,reviewedDraft:{evidence:roomTabsEvidence,relation:'正式归档的已review源清单；运行事实另见unit报告'},status:'正式已应用；域测试通过，公开UI仅3子项通过2未验收；iOS仅静态定义'},
  androidScan:{evidence:report+scanEvidence,implementation:'历史b8e APK/5d152源含平台封装及actualPhotoIO，匹配450项JVM',softwareSubchecksPassed:5,cameraDeniedAlbumAvailable:'实际子项通过',photoRecognition:'真实系统picker公开normal/blank/multiple三图→原生解码通过；非生产码解释/绑定',liveCameraFrames:'未验收',cleanup:{picker:'不适用：already-closed',permission:'通过',mediaItemsPassed:3,logout:'通过',dns:'closed'},productionParser:'阻塞'},
  androidScanLayout:{evidence:report+scanLayoutEvidence,configurations:2,geometry:'通过',pixel:'未验收',restoration:'通过',logout:'通过',dns:'closed'},
};
latestVerification.historicalAndroidEmulator={...latestVerification.androidEmulator,artifactSha256:verifiedAPK,sourceSha256:verifiedSource,relation:'b8e/5d历史run，扫码子项仅绑定此artifact/source'};
latestVerification.historicalAndroidUnit=latestVerification.androidUnit;
latestVerification.historicalAndroidLint={...latestVerification.androidLint,artifactSha256:verifiedAPK,sourceSha256:verifiedSource};
latestVerification.historicalAndroidRelease={...latestVerification.androidRelease,sourceSha256:verifiedSource};
latestVerification.androidEmulator={evidence:report+finalEmulatorEvidence,environment:{evidence:report+finalEnvironmentEvidence},passed:25,blocked:2,
  artifactSha256:candidateAPK,sourceSha256:preferencesSource,sourceFiles:306,sessionKept:false,logout:'AUTH-06正常退出实际通过',dnsForwarding:'closed',
  limits:'专项只读子项通过，不是全范围/视觉/硬件验收；不继承历史b8e扫码子项'};
latestVerification.androidUnit={evidence:report+preferencesUnitEvidence,tests:539,suites:47,failures:0,errors:0,skipped:0,sourceSha256:preferencesSource,sourceFiles:306,relation:'c08d实际已运行APK的同源码检查'};
latestVerification.androidPreferencesUnit.relation='c08d实际已运行APK同源码；后续核心新增未包含在该APK';
latestVerification.androidLint=latestVerification.androidCandidateLint;
latestVerification.androidRelease={...latestVerification.androidCandidateRelease,installation:'实际最终专项25通过+2固件阻塞，正常退出/DNS关闭；不代表后来未新包源码已运行'};
latestVerification.androidCandidateRelease.installation='已实际安装并完成c08d专项；保留candidate字段兼容历史报告读取者';
latestVerification.more={evidence:report+finalEmulatorEvidence,artifactSha256:candidateAPK,sourceSha256:preferencesSource,summary:'通过',members:'通过：loaded',help:'通过：empty',location:'仅unknown态通过，不确认分配'};
latestVerification.androidS016={evidence:report+publicLoginEvidence,unit:{evidence:report+newerUnitEvidence,tests:27},publicUIChecksPassed:25,sendActions:0,submitActions:0,
  artifactSha256:candidateAPK,sourceSha256:preferencesSource,status:'公开门禁/秘密清理/模式与前后台返回子项通过；无真实验证码发送/登录',
  visualDefect:{id:'UI-LOGIN-OTP-001',status:'源码已修；未新包复测',note:'c08d截图验证码框复用密码背景含无交互闭眼图标'}};
latestVerification.nativeRoomTabs={...latestVerification.nativeRoomTabs,ui:{evidence:report+roomTabsUIEvidence,passed:3,notAccepted:2,roomCount:0,refresh:'未观察loading窗口',realRoomSelection:'无实际room tab，fixture不足'},status:'正式源码/域测试已实现；公开UI仅3子项通过，真实房间选择/刷新保留未验收'};
latestVerification.entryOnly={evidence:report+entryOnlyEvidence,passed:12,artifactSha256:candidateAPK,sourceSha256:preferencesSource,sessionKept:true,
  normalLogoutContinuation:{evidence:report+logoutContinuationEvidence,result:'通过',dns:'closed'},relation:'先前保留会话入口run及后续正常退出独立分层，不替代最终专项'};
latestVerification.firmwareShape={evidence:report+finalHTTPEvidence,mcu:'firmware:null',wifi:'firmware:null',status:'HTTP业务成功但候选形状不足；不推导最新版/hasUpdate/虚构版本'};
latestVerification.androidSourceCores={evidence:report+selectionUnitEvidence,tests:596,suites:52,sourceSha256:selectionUnit.provenance.sourceAfter.sourceSha256,sourceFiles:317,
  homeSelectionTests:21,homeActionControlsTests:6,selfUnbindTests:30,status:'正式源码，未新包；批量移除default deny，self-unbind生产接线待完成',
  applications:[report+'home-selection-implementation-application.json',report+'self-unbind-implementation-application.json'].map(evidence=>({evidence}))};
latestVerification.androidLatestSourceUnit={evidence:report+presentationUnitEvidence,tests:620,suites:53,failures:0,errors:0,skipped:0,
  sourceSha256:presentationUnit.provenance.sourceAfter.sourceSha256,sourceFiles:319,relation:'正式最新只读展示核心源码检查；未构建/安装新包，不覆盖c08d APK事实'};
latestVerification.presentationCore={evidence:report+'presentation-owner-implementation-application.json',android:{evidence:report+presentationUnitEvidence,tests:24,result:'JVM通过'},
  ios:{evidence:'ios-as/Tests/Unit/PresentationOwnerTests.swift',definitions:24,execution:'仅定义/静态，未Swift/XCTest'},status:'双端核心正式；全局UI/bridge/DI未接，不代表语言/主题/单位已应用'};
latestVerification.ios={...latestVerification.ios,unitDefinitions:677,definitionBasis:'正式源静态计数，包括S03121/S09630/展示24；不等于执行',
  structure:{evidence:'ios-as/Rowan.xcodeproj/project.pbxproj',objects:347,appSources:90,testSources:46,execution:'仅静态结构，无Xcode/Swift/XCTest'},execution:'未Swift/XCTest/macOS执行'};
latestVerification.androidScan={...latestVerification.androidScan,artifactSha256:verifiedAPK,sourceSha256:verifiedSource,relation:'仅b8e/5d历史APK证据；不得移植为c08d扫码通过'};
latestVerification.androidScanLayout={...latestVerification.androidScanLayout,artifactSha256:verifiedAPK,sourceSha256:verifiedSource,relation:'历史b8e/5d，非c08d视觉/扫码验收'};
function verifyReferences(value) {
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)) {
    if((key==='evidence'||key==='log')&&typeof child==='string'&&!existsSync(new URL(child,root)))throw new Error(`Evidence missing: ${child}`);
    if(child&&typeof child==='object')verifyReferences(child);
  }
}
latestVerification.androidLatestSourceUnit={evidence:report+fixtureUnitEvidence,tests:620,suites:53,failures:0,errors:0,skipped:0,sourceSha256:fixtureSource,sourceFiles:323,relation:'f249正式源码同源JVM检查；与ef3043 host/test消费者编译对应，不代表完整UI矩阵通过'};
latestVerification.androidFixtureConsumerBuild={sourceSha256:fixtureSource,sourceFiles:323,artifactSha256:fixtureAPK,testArtifactSha256:fixtureTestAPK,
 checks:fixtureProvenanceEvidence.map(evidence=>({evidence:report+evidence,result:'编译/检查通过'})),runtime:'只公开OTP视觉和empty-home局部通过；多房间case失败，完整UI未通过'};
latestVerification.androidS016.previousPublicUI={evidence:report+publicLoginEvidence,artifactSha256:candidateAPK,sourceSha256:preferencesSource,passed:25};
latestVerification.androidS016.visualFollowup={evidence:report+otpVisualEvidence,artifactSha256:fixtureAPK,sourceSha256:fixtureSource,passed:4,sendActions:0,submitActions:0,cleanup:'welcome-confirmed',screenshots:otpVisual.screenshots.map(name=>({evidence:report+name})),scope:'公开固定输入视觉复测；非SMTP/验证码发送或登录/完整像素验收'};
latestVerification.androidS016.visualDefect={id:'UI-LOGIN-OTP-001',status:'源码已修且f249/ef3043新包公开视觉复测通过',evidence:report+otpVisualEvidence};
latestVerification.nativeRoomTabs.controlledFixture={artifactSha256:fixtureAPK,testArtifactSha256:fixtureTestAPK,sourceSha256:fixtureSource,
 initial:{evidence:report+fixtureInitialEvidence,status:'环境阻塞',note:'Root实际确认System UI not responding遮挡首页焦点；原始报告failed保留，不归因应用'},
 retry:{evidence:report+fixtureRetryEvidence,status:'部分失败',passed:['empty-home'],failed:['multiple-rooms-same-name-and-opaque-id'],screenshot:{evidence:report+fixtureRetryEvidence.replace('report.json','00-empty-home.png')},geometry:'仅empty-home通过',pixel:'未验收'},
 scope:'真实HomeActivity和测试替身HTTP数据，非真实HTTP/产品控制/整行验收'};
latestVerification.historicalC08dEmulator={...latestVerification.androidEmulator};
latestVerification.historicalC08dUnit={...latestVerification.androidUnit};
latestVerification.historicalF249SourceUnit={...latestVerification.androidLatestSourceUnit};
latestVerification.androidEmulator={evidence:report+currentEmulatorEvidence,passed:25,blocked:2,artifactSha256:currentAPK,sourceSha256:currentSource,sourceFiles:326,sessionKept:false,logout:'正常AUTH06实际通过',dnsForwarding:'closed',scope:'真实HTTP/原生及RN只读主回归子项；不代表全部范围行验收'};
latestVerification.androidUnit={evidence:report+currentUnitEvidence,tests:643,suites:54,failures:0,errors:0,skipped:0,sourceSha256:currentSource,sourceFiles:326,relation:'当前已运行3fc9 APK的同源码JVM检查'};
latestVerification.androidLatestSourceUnit={...latestVerification.androidUnit};
latestVerification.androidLatestBuild={sourceSha256:currentSource,sourceFiles:326,artifactSha256:currentAPK,testArtifactSha256:currentTestAPK,lint:{evidence:report+currentBuildEvidence[0],errors:0,warnings:29,result:'通过'},release:{evidence:report+currentBuildEvidence[1],result:'通过'},androidTest:{evidence:report+currentBuildEvidence[2],result:'消费者编译通过'}};
latestVerification.nativeRoomTabs.matrix={evidence:report+matrixEvidence,fixtureOnly:true,realHttpAcceptance:false,pixelAcceptance:false,sourceSha256:currentSource,artifactSha256:currentAPK,testArtifactSha256:currentTestAPK,configurations:4,scenariosPassed:36,pngCount:40,restoration:'精确恢复通过',children:matrix.configurations.map(c=>({id:c.configuration.id,evidence:report+c.report,screenshots:c.screenshots.map(path=>({evidence:report+path}))})),manualBase:{evidence:report+manualBaseEvidence,scenariosPassed:9,pngCount:10}};
latestVerification.nativeRoomTabs.status='正式源码/域测试与四配置受控真实Home UI通过；fixture非真实服务器房间数据，像素及iOS仍未验收，保留历史失败';
latestVerification.ios={...latestVerification.ios,unitDefinitions:699,definitionBasis:'Root正式源静态计数，未执行；不含缓存Presentation系统R2定义',structure:{evidence:'ios-as/Rowan.xcodeproj/project.pbxproj',objects:353,appSources:92,testSources:47,execution:'仅静态结构，无Xcode/Swift/XCTest'}};
latestVerification.rn={...latestVerification.rn,methods:13,scope:'正式100项测试/13桥接方法；缓存114测试与未正式方法不计入'};
latestVerification.firmwareShape.currentUI={evidence:report+currentEmulatorEvidence,status:'当前mcu/wifi实际error态；历史HTTP firmware:null证据保留原run关联，不从error推断新版候选或无更新'};
latestVerification.firmwareShape.latestDirectHTTP={evidence:report+currentDirectHTTPEvidence,mcu:{fieldPresent:true,firmwareType:'null',deviceIdMatches:true},wifi:{fieldPresent:true,firmwareType:'null',deviceIdMatches:true},relation:'最新独立Node真实HTTP类型证据，与当前APK mcu/wifi error态关联；不替代原生HTTP/UI/候选完整验收，历史19:15证据保留'};
latestVerification.latestDirectHTTP={evidence:report+currentDirectHTTPEvidence,execution:'独立Node真实HTTP，不等于原生/App服务验收',timer:{state:'empty',count:0},auth06:'通过',content:{query:{type:'text'},brandRegion:'当前未配置可选brand/region',privacyBusinessCode:1002030000,serviceTermsBusinessCode:1002030001,status:'当前配置/契约待核对；不从此声明服务回归'},mutations:'仅该正式工具已记录的账号会话流程；无定时/OTA/设备写操作'};
const jointUnitEvidence='android-unit-2026-11-01T22-38-55.207Z/summary.json';
const jointUnit=read(report+jointUnitEvidence),jointBuild=read(report+'self-unbind-joint-final-release-provenance.json');
if(jointUnit.totals.tests!==691||jointUnit.suites.length!==57||jointUnit.totals.failures||jointUnit.totals.errors||jointUnit.totals.skipped||
 jointUnit.provenance.exitCode!==0||!jointUnit.provenance.sourceUnchangedDuringCheck||jointUnit.provenance.sourceAfter.sourceSha256!==jointBuild.sourceAfter.sourceSha256||!jointBuild.sourceUnchangedDuringBuild)throw Error('Joint source check mismatch');
latestVerification.androidLatestSourceUnit={evidence:report+jointUnitEvidence,tests:691,suites:57,failures:0,errors:0,skipped:0,sourceSha256:jointBuild.sourceAfter.sourceSha256,sourceFiles:336,relation:'正式最新源码检查；与下列旧包完整运行证据分别统计'};
latestVerification.androidLatestBuild={sourceSha256:jointBuild.sourceAfter.sourceSha256,sourceFiles:336,artifactSha256:jointBuild.artifactSha256,
 lint:{evidence:report+'self-unbind-joint-final-lint-provenance.json',errors:0,warnings:29,result:'通过'},
 release:{evidence:report+'self-unbind-joint-final-release-provenance.json',result:'通过'},
 androidTest:{evidence:report+'self-unbind-joint-final-androidtest-provenance.json',result:'消费者编译通过'}};
latestVerification.rn={...latestVerification.rn,methods:16,tests:116,scope:'正式lint/typecheck与12文件116项测试通过；原生确认入口不等于真实解绑闭环',evidence:report+'自解绑确认与授权隔离-20261102.md'};
latestVerification.ios={...latestVerification.ios,unitDefinitions:754,definitionBasis:'Root正式源码静态计数，未执行',structure:{evidence:'ios-as/Rowan.xcodeproj/project.pbxproj',objects:367,appSources:96,testSources:50,execution:'仅静态结构，无Xcode/Swift/XCTest'}};
const jointMatrixEvidence='android-home-joint-matrix-cdc53e11-6ca9-48a9-8c4a-5d78888c3c95/archive-index.json';
const jointMatrix=read(report+jointMatrixEvidence);
if(jointMatrix.status!=='passed'||!jointMatrix.finalSourceMatches||jointMatrix.hostSha256!==jointBuild.artifactSha256||jointMatrix.sourceSha256!==jointBuild.sourceAfter.sourceSha256||
 jointMatrix.configurations.length!==4||jointMatrix.restoration.result!=='passed'||jointMatrix.configurations.some(c=>c.status!=='passed'||c.passed!==9||c.screenshots.length!==10))throw Error('Joint matrix mismatch');
latestVerification.nativeRoomTabs.latestControlledMatrix={evidence:report+jointMatrixEvidence,sourceSha256:jointMatrix.sourceSha256,artifactSha256:jointMatrix.hostSha256,
 configurations:4,scenariosPassed:36,pngCount:40,restoration:'精确恢复通过',fixtureOnly:true,pixelAcceptance:false,realHttpAcceptance:false};
const jointMainEvidence='android-emulator-2026-11-01T22-53-37.136Z.json';
const jointCancelEvidence='android-self-unbind-cancel-2026-11-01T22-56-33.737Z.json';
const jointLogoutEvidence='android-native-readonly-2026-11-01T22-57-24.160Z.json';
const jointMain=read(report+jointMainEvidence),jointCancel=read(report+jointCancelEvidence),jointLogout=read(report+jointLogoutEvidence);
if(jointMain.installedArtifactSha256!==jointBuild.artifactSha256||!jointMain.installedArtifactMatchesBuild||jointMain.sourceSha256!==jointBuild.sourceAfter.sourceSha256||
 !jointMain.sessionKept||counts(jointMain,'通过')!==24||counts(jointMain,'阻塞')!==2||jointMain.results.length!==26||jointMain.dnsForwarding.state!=='closed'||
 jointLogout.parentRunId!==jointMain.runId||jointLogout.installedArtifactSha256!==jointBuild.artifactSha256||!jointLogout.logoutOnly||jointLogout.dnsForwarding.state!=='closed'||
 jointLogout.results.length!==1||jointLogout.results[0].id!=='AUTH-06-native-logout-continuation'||jointLogout.results[0].result!=='通过')throw Error('Joint actual readonly/logout mismatch');
if(jointCancel.parentRunId!==jointMain.runId||jointCancel.installedArtifactSha256!==jointBuild.artifactSha256||jointCancel.source.sourceSha256!==jointMain.sourceSha256||
 !jointCancel.sourceUnchanged||jointCancel.positiveActions!==0||jointCancel.results.length!==3||jointCancel.results.some(r=>r.result!=='通过')||jointCancel.dnsForwarding.state!=='closed')throw Error('Joint cancel mismatch');
latestVerification.previousAndroidRuntime={androidEmulator:latestVerification.androidEmulator,androidUnit:latestVerification.androidUnit,artifactSha256:currentAPK,sourceSha256:currentSource};
latestVerification.androidUnit={...latestVerification.androidLatestSourceUnit,relation:'本批运行1417 APK的同源码JVM检查'};
latestVerification.androidEmulator={evidence:report+jointMainEvidence,passed:24,blocked:2,artifactSha256:jointBuild.artifactSha256,sourceSha256:jointMain.sourceSha256,sessionKept:true,
 logout:{evidence:report+jointLogoutEvidence,result:'通过',passed:1,parentRunId:jointMain.runId},totalWithContinuation:{passed:25,blocked:2},dnsForwarding:'主run与退出continuation均closed'};
latestVerification.selfUnbindCancel={evidence:report+jointCancelEvidence,passed:3,positiveActions:0,sourceUnchanged:true,realRelationshipWriteAcceptance:false,
 limitation:'仅原生确认、取消提示、返回首页；不证明真实解绑闭环，用户确认真实关系写联调阻塞'};
const shareUnitEvidence='android-unit-2026-11-01T23-04-30.724Z/summary.json';
const shareUnit=read(report+shareUnitEvidence),shareBuild=read(report+'share-code-release-provenance.json'),shareTest=read(report+'share-code-androidtest-provenance.json'),shareLint=read(report+'share-code-lint-provenance.json');
if(shareUnit.totals.tests!==701||shareUnit.suites.length!==58||shareUnit.totals.failures||shareUnit.totals.errors||shareUnit.totals.skipped||
 shareUnit.provenance.exitCode!==0||!shareUnit.provenance.sourceUnchangedDuringCheck||shareUnit.provenance.sourceAfter.sourceSha256!==shareBuild.sourceAfter.sourceSha256||
 !shareBuild.sourceUnchangedDuringBuild||!shareTest.sourceUnchangedDuringBuild||shareTest.targetArtifactSha256!==shareBuild.artifactSha256||shareTest.sourceAfter.sourceSha256!==shareBuild.sourceAfter.sourceSha256||
 shareLint.exitCode!==0||!shareLint.sourceUnchangedDuringCheck||shareLint.sourceAfter.sourceSha256!==shareBuild.sourceAfter.sourceSha256)throw Error('Share adapter source/build mismatch');
latestVerification.androidLatestSourceUnit={evidence:report+shareUnitEvidence,tests:701,suites:58,failures:0,errors:0,skipped:0,sourceSha256:shareBuild.sourceAfter.sourceSha256,sourceFiles:339,relation:'后续分享码协议适配源码，未装配生产入口；不沿用1417模拟器通过状态'};
latestVerification.androidVerifiedBuild={...latestVerification.androidLatestBuild};
latestVerification.androidLatestBuild={sourceSha256:shareBuild.sourceAfter.sourceSha256,sourceFiles:339,artifactSha256:shareBuild.artifactSha256,testArtifactSha256:shareTest.artifactSha256,
 lint:{evidence:report+'share-code-lint-provenance.json',errors:0,warnings:29,result:'通过'},release:{evidence:report+'share-code-release-provenance.json',result:'通过'},
 androidTest:{evidence:report+'share-code-androidtest-provenance.json',result:'消费者编译通过'},runtime:'候选包未安装运行，不替代latestVerifiedAndroidAPK'};
latestVerification.shareCodeAdapter={evidence:report+'分享码原生协议适配-20261102.md',androidTests:10,iosTestDefinitions:10,productionEntry:'未装配',realIntegration:'阻塞'};
latestVerification.ios={...latestVerification.ios,unitDefinitions:764,definitionBasis:'正式源码静态计数；新增分享码10定义，均未执行',structure:{evidence:report+'share-code-ios-static-provenance.json',objects:373,appSources:98,testSources:51,execution:'仅静态结构，无Xcode/Swift/XCTest'}};
verifyReferences(latestVerification);
const document={schemaVersion:1,reviewedOn:'2026-11-02',scope:mapping.scope,scopeSha256:mapping.scopeSha256,
  sourceMapping:'docs/SDD/重构范围映射核对.json',
  note:'人工维护执行覆盖层。进行中可包含仅准备测试或局部基础实现；partialEvidence仅证明对应子检查，不代表范围行通过。所有完整验收用例保持未验收，直到逐例验证；未使用不适用掩盖缺失实现。',
  latestVerifiedAndroidAPK:jointBuild.artifactSha256,
  latestVerifiedAndroidSource:{sha256:jointMain.sourceSha256,files:336},latestVerification,
  scopeAcceptance:{total:111,fullyAccepted:0},
  limits:['最新1417/0b71：691项57套/lint0错29警告/RN116/16方法/双APK编译；真实主run24通过2固件阻塞，独立正常退出1项通过；取消3项通过且确认点击0，真实关系写仍阻塞；四配置36场景40图及精确恢复通过，非完整像素或iOS验收',
    '后续ec331/62b987分享码协议适配候选：701项58套/lint0错29警告/双APK编译，未安装运行、未装配生产分享入口；不得把前批UI/真实联调证据归属到该候选包',
    '历史实际运行3fc9/725e：643项54套/lint0错29警告/双APK消费者编译，真实主回归25通过2固件阻塞、正常退出DNSclosed；四配置受控fixture36场景40图及精确恢复通过，不是完整像素/真实HTTP房间验收',
    '历史实际运行c08d/0e254d：539项47套/lint0错27警告/release、专项25通过2固件阻塞、正常退出且DNSclosed；后续f249/ef3043已有620/53同源单测、lint及host/test消费者编译与局部UI，未完成新包整轮UI',
    '历史b8e/5d的扫码PhotoPicker三图/五软件子项及两配置几何仍只绑定历史artifact/source，不能移植给c08d；pixel/真实相机帧/生产QR/绑定未验收',
    '验证码公开25子项0send0submit，不是实际邮件/验证码登录；UI-LOGIN-OTP-001后续f249新包4项视觉已复测0send0submit；真实fixture empty通过、多房间失败，不是完整矩阵通过。房间公开3通过2未验收，缺真实tab和loading观测不假通过',
    'iOS764定义/373objects/98app/51test仅静态，不等于Swift/XCTest/macOS通过；完整全局展示UI/RN桥接/资源尚未接',
    'S096双端及RN原生确认和任务接线已formal，取消UI已实际验证；真实关系写因缺第二账号和隔离设备阻塞；S032批量执行仍defaultdeny，111整行验收仍0',
    '生产产品字段/动作字典用户确认暂无补充，保持阻塞；最新真实OTA firmware:null不推导无更新/最新版',
    '硬件能力未验收；云端快照不证明设备在线或控制执行'],
  items};
writeFileSync(new URL(report+'范围执行状态.json',root),JSON.stringify(document,null,2)+'\n');
console.log(`Execution overlay: ${items.length} unique scope rows, ${items.filter(x=>Object.values(x.implementation).includes('进行中')).length} rows started, 0 rows accepted.`);
