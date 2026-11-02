# Android production composition checkpoint 独立只读评审

对象：`review-checkpoint-android/`，snapshot.json 标记 FROZEN_READONLY_CHECKPOINT_NOT_APPLYABLE_PATCH。实际只读重新计算12个Kt文件SHA均与snapshot匹配。未改checkpoint/正式源，未Gradle、ADB、网络、SDK/Kotlin或测试执行。以下是确定源码交错，不是已运行的平台失败证据。

## 四项 P2（均集中在 SelfUnbindApplication.begin）

1. **容量没有硬上限**，`SelfUnbindApplication.kt:126–128`。达到128只尝试淘汰terminal，找不到仍无条件插入。UNKNOWN/cleanup_pending不淘汰；保留一个同resource observer，再反复关闭/重开另一页的handle以清core intent缓存、为每页发新intent，可累积超过128的强binding/wrapper。容量判断且在core.begin后，简单事后拒绝不足以保证零dispatch。需前置原子admission/保留槽，满且无可淘汰项时零core调用。
2. **同intent wrapper创建不原子**，`:115–128`。两线程同registration+intent从core获得同task/id；可都通过operations无项检查，各建worker，后插入者覆盖。core仅一次DELETE，但两个wrapper collector初次settle即停止，后续publishRecord只更新被登记的一个，另一等待者可能永久cleanup_pending。需稳定key原子get/create和唯一wrapper，覆盖实际并发与后续恢复终态。
3. **await丢弃确定终态**，`:119–121`。最终StateFlow emit和Deferred完成续体独立调度；await先完成而collector尚未消费最后值，finally取消collector导致wrapper滞留preparing/sending/cleanup_pending。journal已terminal时unresolved扫描不能修复。需显式publish await返回的SelfUnbindView，再停collector，保留completed优先/当前binding投影；用受控dispatcher而非Unconfined定义该顺序。
4. **用可变wire operationId查旧binding wrapper**，`:113–115`。core遇旧journal UNKNOWN会把view.operationId改成saved.operationId；core先于app取id完成时（Unconfined可确定），operations[oldId]可命中旧页/旧账号revision wrapper，没有registration/R匹配。新binding可能借旧origin投影或session_changed，破坏新binding独立历史结果解释。需按registration identity+intent稳定归属登记，不以可变view ID全局归并；recovery逐wrapper按其binding投影。

四项已即时发Root及作者 `/root/review_account_foundation`。作者确认成立，计划在最终code另修，冻结checkpoint仍保持原样；需最终稿重新review，不能因确认修法就视作关闭。

## 其余核对与限制

- coordinator先durable UNKNOWN再单次DELETE；已有UNKNOWN/ACK/ABSENCE不重发，恢复仅journal+实际新HOME完整列表，不依据选中房间或旧缓存判无成员。
- HomeReadGate按同账号revision/user共享actual permit，持到非合作read真实返回；HomeRoomTabs install receipt+generation与whileInstalled在同锁内，页面关闭/新read使旧receipt失效。
- consumer只保留一个actual job+pending bit；后台/离页撤publication，early return等待旧实际I/O，换账号用新scope/gate，不借旧R结果。
- recovery单实际journal drain+一位重试意图；account tuple每阶段检查。UNKNOWN仅在新HOME已安装且确认原ticket不含resource后转absence_observed，仍不得重放DELETE。
- resource receipt带process/owner/serial；同process其它owner不能当已退休，新resource serial不被旧receipt退休；前process资源结束可完成恢复，仍要当前账号完整HOME确认。真实KeyStore/进程死亡/SDK平台行为未运行。
- AppServices默认使用同Account唯一authority、独立加密journal、既有HTTP repo；ownerIfCreated检查lazy状态，HOME恢复不主动创建MQTT owner。测试fixture注入内存journal，网关不转发真实HTTP/写。
- journal全局mutex+IO/NonCancellable，AEAD独立key/AAD，完整document有64记录/256KiB限额，按user/resource key及operation/origin/resource receipt compare完成；未决不淘汰。该静态核对不是实际加密存储/崩溃一致性验证。
- 原resource receipt、未知不重放与actualIO屏障未再定位新的确定P1/P2；测试依赖Unconfined仍不能替代多线程/排队调度及最终消费者编译。

本结论只覆盖这12文件checkpoint；无完整Swift最终稿、最终patch/context/PBX验证、生产写RPC/UI/许可发行或真实关系修改验收。四项P2未修前不应将本checkpoint作为可直接应用实现。
