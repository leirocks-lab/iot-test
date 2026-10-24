import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { DeviceShareFlow } from "../services/device-share";
import { useApp } from "../ui/context";
import { Busy, Button, ErrorText, Label, Page } from "../ui/kit";

function ShareContent({
  id,
  runtime,
}: {
  id: string;
  runtime: NonNullable<ReturnType<typeof useApp>["runtime"]>;
}) {
  const flow = useMemo(
    () => new DeviceShareFlow(runtime.service, id),
    [runtime, id],
  );
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);

  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState === "active") flow.start();
      const subscription = AppState.addEventListener("change", (status) => {
        if (status === "active") flow.start();
        else flow.stop();
      });
      const timer = setInterval(() => flow.tick(), 1000);
      return () => {
        clearInterval(timer);
        subscription.remove();
        flow.stop();
      };
    }, [flow]),
  );

  return (
    <Page title="Share device">
      {state.deviceName && <Label large>{state.deviceName}</Label>}
      {state.phase === "loading" && <Busy />}
      <ErrorText error={state.error} />
      {state.phase === "expired" && <Label>分享码已到期，请重新获取</Label>}
      {state.phase === "unsupported" && (
        <Label muted>已核对服务端分享响应，正式二维码格式仍待确认</Label>
      )}
      {state.active && state.phase !== "blocked" && state.phase !== "unsupported" && (
        <Button
          title="获取新分享码"
          disabled={state.phase === "loading"}
          onPress={() => void flow.refresh()}
        />
      )}
      {state.active && state.phase === "failed" && (
        <Label muted>获取失败后可重试；此前分享码不再显示</Label>
      )}
    </Page>
  );
}

export default function Share() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { runtime } = useApp();
  if (!runtime) {
    return (
      <Page title="Share device">
        <Busy />
      </Page>
    );
  }
  return (
    <ShareContent
      key={`${id}-${runtime.service.sessionRevision}`}
      id={id}
      runtime={runtime}
    />
  );
}
