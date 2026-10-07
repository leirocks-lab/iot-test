# 本机全局 Gradle 阿里云镜像方案

## 已确认需求

用户要求后续始终使用阿里云 Maven 镜像，并于 2026-10-07 明确选择对所有 Gradle 项目生效，而非仅对 ROWAN 项目生效。

## 配置方式与范围

在当前 Windows 用户的 Gradle 用户目录中安装独立初始化脚本，预期位置为 `C:/Users/Leon/.gradle/init.d/aliyun-maven-mirrors.gradle`。实施前再次确认实际 Gradle 用户目录。使用此用户目录启动的命令行、IDE、子项目和组合构建均应用该配置；其他用户或显式使用其他 Gradle 用户目录的构建不自动继承。

不手改 Expo 生成的 `android/` 文件。与逐个项目修改仓库相比，用户级初始化脚本可集中生效且方便撤销；原先提出的仅 ROWAN 范围方案不再采用。

## 下载仓库映射

| 标准公共仓库 | 阿里云 HTTPS 镜像 |
| --- | --- |
| Google Maven：`dl.google.com/dl/android/maven2`、`dl.google.com/android/maven2`、`maven.google.com` | `https://maven.aliyun.com/repository/google` |
| Maven Central：`repo.maven.apache.org/maven2`、`repo1.maven.org/maven2` | `https://maven.aliyun.com/repository/central` |
| Gradle Plugin Portal：`plugins.gradle.org/m2` | `https://maven.aliyun.com/repository/gradle-plugin` |

覆盖 settings 的插件管理与依赖仓库，以及项目依赖仓库和 buildscript 仓库。初始化钩子必须在依赖解析前处理已存在及后续新增的仓库，并通过测试验证实际 Gradle 行为。

只替换上述标准仓库地址，保留仓库原有顺序、内容过滤和元数据配置。保留本地、私有、自定义、JitPack 及 Maven 发布仓库；不转发私有凭据。不自动增加不存在的仓库，不回退到发生证书异常的官方地址。

## 安全、兼容与撤销

- 保持 HTTPS 证书及主机名校验，不允许不安全 HTTP，也不修改系统 DNS、代理或 hosts。
- 不修改现有其他 Gradle 初始化脚本。目标文件已存在时先读取并处理冲突，不直接覆盖。
- 不修改 Gradle Wrapper 分发地址，也不将 Maven 镜像设置误用于 Android SDK、JDK 或 npm 下载。
- 不强制改变其他项目的 Java、Gradle 或依赖版本。ROWAN 本次构建使用单独安装的 JDK 17，保留现有 JDK 21 全局配置。
- 镜像未同步的依赖或明确禁止初始化配置的构建须报告限制，不能以关闭安全校验解决。
- 删除或将本脚本移出 `init.d` 可撤销；已有构建缓存保留。

## 验证与继续运行

1. 在隔离的最小 Gradle 构建中验证标准地址映射、插件和依赖仓库、后续新增仓库，以及私有/本地/发布仓库保持不变。
2. 安装后验证配置确实由默认用户目录自动加载，不要求每次传入初始化脚本参数。
3. 验证 ROWAN 组合构建实际使用阿里云域名，并保留已有项目与用户修改。
4. 继续完成 Android APK 构建；PowerShell 的 `-P` 参数整体加引号，避免此前被解析为任务名的问题。
5. 构建时限制并发与内存，必要时先正常关闭本次模拟器，再于编译完成后打开。
6. 安装 APK、启动 Metro，通过 ADB 和实际页面验证 ROWAN 首页，完成前运行 lint 和类型检查；单独镜像配置成功不等于应用运行成功。

## 书面方案审阅

全局范围已获用户确认。此文件待用户审阅确认后进入实现计划与配置安装。
