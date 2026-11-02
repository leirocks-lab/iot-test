# OS presentation API 核对

2026-11-02，仅官方文档只读查询及本地 Android36 android.jar 声明读取；未执行 SDK、编译器、模拟器或 UIKit。Apple 无本地 SDK，链接/声明审查不代替可用性编译检查。

| 使用点 | 官方依据与适用边界 |
| --- | --- |
| Android Application 注册/注销 | [Application](https://developer.android.com/reference/android/app/Application)：四个 ActivityLifecycleCallbacks/ComponentCallbacks 注册/注销入口为 API14；Android13 后依赖 attachBaseContext 已完成。缓存从 onCreate 注册，用相同对象注销并要求 main。onTerminate 仅模拟进程环境回调，不是生产进程终止保证。 |
| Android 系统 Configuration | [Resources.getSystem](https://developer.android.com/reference/android/content/res/Resources#getSystem()) 为 API1，仅系统资源；不适用于屏幕尺寸、旋转或应用资源呈现。本稿只读取语言与 night 状态，绝不拿它渲染尺寸。 |
| Android night / locales | [Configuration](https://developer.android.com/reference/android/content/res/Configuration)：night 枚举 API8，getLocales API24，适配现项目 minSDK；undefined 不猜 light，而作为缺少 OS 输入。实际系统变化是否完整体现在全局 Resources 仍需 API36 运行验证。 |
| iOS 原始 screen traits | [UITraitCollection](https://developer.apple.com/documentation/uikit/uitraitcollection)、[userInterfaceStyle](https://developer.apple.com/documentation/uikit/uitraitcollection/userinterfacestyle)、[UIWindowScene.screen](https://developer.apple.com/documentation/uikit/uiwindowscene/screen)、[UIWindow.screen](https://developer.apple.com/documentation/uikit/uiwindow/screen)。取 scene.screen 优先，当前无 scene 的 legacy UIWindow 才取 window.screen；后者已废弃，需要未来平台迁移。 |
| iOS style override 隔离 | [Choosing a specific interface style](https://developer.apple.com/documentation/uikit/choosing-a-specific-interface-style-for-your-ios-app)、[UIView.overrideUserInterfaceStyle](https://developer.apple.com/documentation/uikit/uiview/overrideuserinterfacestyle)：window/view 局部覆盖作用于其层级。screen 作为上游 OS 输入是据官方层级作出的工程推断，仍须 macOS/UIKit 验证，不能写成实测事实。当前 Info.plist 不强制 UIUserInterfaceStyle。 |
| iOS trait 变化 | [traitCollectionDidChange](https://developer.apple.com/documentation/uikit/uitraitenvironment/traitcollectiondidchange(_:))：采用适合部署目标 iOS15.1 的既有方法，并调用 super；新 SDK 已废弃此回调，后续可迁移 registerForTraitChanges，但不在本稿悄悄提高部署版本。 |
| iOS locale / active | [NSLocale.preferredLanguages](https://developer.apple.com/documentation/foundation/nslocale/preferredlanguages)、[currentLocaleDidChangeNotification](https://developer.apple.com/documentation/foundation/nslocale/currentlocaledidchangenotification)、[didBecomeActive](https://developer.apple.com/documentation/uikit/uiapplication/didbecomeactivenotification)、[willResignActive](https://developer.apple.com/documentation/uikit/uiapplication/willresignactivenotification)。locale 通知仅失效信号；每次前台重新读取语言列表，不假设通知携带最新值。 |

Android 本地声明额外证据：`android-sdk-declarations.json` 记录 android.jar 原文件 SHA 与选定 public 方法描述符，由 `inspect_android_api.py` 直接解析 class 文件生成；未运行 javap 或 SDK 方法。Apple 网页部分提供 JS/Markdown 入口，工具不能完整抓取所有页面，不能据此冒充本地 SDK 类型检查。
