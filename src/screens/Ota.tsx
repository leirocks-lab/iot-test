import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { AppState, View } from 'react-native';
import { DeviceOtaFlow } from '../services/device-ota';
import type { OtaStatus } from '../services/models';
import { useApp } from '../ui/context';
import { Busy, Button, Card, ErrorText, Label, Page, confirm, styles } from '../ui/kit';

const statusLabel: Record<OtaStatus, string> = {
  waiting: '等待升级',
  downloading: '下载中',
  upgrading: '安装中',
  success: '升级成功',
  failed: '升级失败',
  cancelled: '已取消',
};

function OtaContent({
  id,
  runtime,
}: {
  id: string;
  runtime: NonNullable<ReturnType<typeof useApp>['runtime']>;
}) {
  const flow = useMemo(() => new DeviceOtaFlow(runtime.service, id), [runtime, id]);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);

  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active') flow.start();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') flow.start();
      else flow.stop();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void flow.poll();
    }, 5000);
    return () => {
      clearInterval(timer);
      subscription.remove();
      flow.stop();
    };
  }, [flow]));

  const running = state.task?.result === 'updating';
  const canCreate = state.active && !state.busy && !state.unknown &&
    state.checked && !!state.check?.hasUpdate && !!state.check.firmware &&
    !running && (!state.taskID || !!state.task);
  const canCancel = state.active && !state.busy && !state.cancelPending &&
    running && ['waiting', 'downloading', 'upgrading'].includes(state.task?.status ?? '');

  return (
    <Page title="Firmware updates">
      {!!state.deviceName && <Label large>{state.deviceName}</Label>}
      <View style={styles.row}>
        {(['mcu', 'wifi'] as const).map((type) => (
          <Button
            key={type}
            title={type === 'mcu' ? 'MCU' : 'Wi-Fi'}
            secondary={state.type !== type}
            disabled={!state.active || state.busy}
            onPress={() => flow.select(type)}
          />
        ))}
      </View>
      <ErrorText error={state.error} />
      {state.busy && <Busy />}
      <Button
        title="检查更新"
        disabled={!state.active || state.busy}
        onPress={() => void flow.check()}
      />
      {state.checked && (
        <Card>
          {state.check?.hasUpdate && state.check.firmware ? (
            <>
              <Label large>{state.check.firmware.version}</Label>
              <Label>{state.check.firmware.remark}</Label>
              <Button
                title="开始升级"
                disabled={!canCreate}
                onPress={() => confirm(
                  '确认升级',
                  `将 ${state.deviceName || id} 的 ${state.type.toUpperCase()} 升级至 ${state.check!.firmware!.version}。请保持设备电源和网络连接。`,
                  () => void flow.create(),
                )}
              />
            </>
          ) : <Label>已是最新版本</Label>}
        </Card>
      )}
      {state.unknown && (
        <Card>
          <Label>创建结果待核对，暂不能再次发起升级。</Label>
          <Label muted>需要服务端提供任务发现或幂等核对能力后恢复。</Label>
        </Card>
      )}
      {!!state.taskID && (
        <Card>
          <Label>任务：{state.taskID}</Label>
          {state.task ? (
            <>
              <Label large>{statusLabel[state.task.status]}</Label>
              <Label>进度：{state.task.progress}%</Label>
              {state.cancelPending && <Label muted>取消结果待核对，不会重复提交。</Label>}
              {canCancel && (
                <Button
                  secondary
                  title="请求取消升级"
                  onPress={() => confirm(
                    '确认取消升级',
                    '将请求取消当前升级任务，最终结果以任务状态为准。',
                    () => void flow.cancel(),
                  )}
                />
              )}
            </>
          ) : <Label>正在查询升级任务状态…</Label>}
        </Card>
      )}
    </Page>
  );
}

export default function Ota() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runtime, revision } = useApp();
  if (!runtime) return <Page title="Firmware updates"><Busy /></Page>;
  return <OtaContent key={`${id}-${revision}`} id={id} runtime={runtime} />;
}
