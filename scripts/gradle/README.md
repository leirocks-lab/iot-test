# 本机全局 Maven 镜像

`aliyun-maven-mirrors.gradle` 是用户级 Gradle 初始化脚本，不是项目构建脚本。当前机器安装到 `C:\Users\Leon\.gradle\init.d\aliyun-maven-mirrors.gradle`；若设置 `GRADLE_USER_HOME` 或使用 `--gradle-user-home`，需安装到对应目录。

只把标准 Google Maven、Maven Central、Gradle Plugin Portal 的 HTTPS 地址映射到阿里云对应仓库。保留原有仓库对象、顺序、过滤与元数据；本地、私有、自定义、JitPack 和发布仓库不变。不会增加不存在的仓库，不会回退官方仓库，也不修改 TLS、Java、DNS、代理、Wrapper、SDK 或 npm。

标准仓库存在认证配置时构建会明确报错，避免将凭据转发给镜像。镜像未同步依赖时需自行排查，不应关闭证书校验。

## 安装与撤销

安装前读取目标文件及其他全局初始化脚本；不同内容不得直接覆盖。将本文件复制到实际用户目录的 `init.d`，相同内容再次安装无需操作。

撤销时仅将 `aliyun-maven-mirrors.gradle` 移出 `init.d`，不删除其他配置或缓存。其他系统用户和使用独立用户目录的构建不会自动继承。

## 离线验证

从仓库根目录使用 JDK 17 和现有 Android Wrapper：

```powershell
$env:JAVA_HOME='D:\Android\Java\jdk-17.0.20.1+1'
.\android\gradlew.bat -p tests/gradle-mirrors verifyMirrorRepositories verifyIncludedMirrorRepositories --offline --console=plain
```

未安装时可加 `-I (Resolve-Path scripts/gradle/aliyun-maven-mirrors.gradle).Path`。`-p` 会改变相对初始化脚本路径的基准，所以 `-I` 使用绝对路径。

增加 `'-PcredentialConflict=true'` 是负向测试：应退出非零并包含 `Aliyun mirror credential conflict`。正常场景应输出两项 PASS 和 `BUILD SUCCESSFUL`，无需联网。

脚本在 Gradle 9.3.1 上验证；使用 `beforeSettings` 需要 Gradle 6.0+，6.8 以前没有集中依赖仓库接口。旧于 6.0 的构建会警告，不能保证设置插件仓库重定向；本配置不自动升级其他项目。配置缓存和其他 Gradle 版本需要在对应项目中另行验证。

官方参考：[Gradle 初始化脚本](https://docs.gradle.org/current/userguide/init_scripts.html)、[阿里云 Maven 仓库](https://maven.aliyun.com/mvn/guide)。
