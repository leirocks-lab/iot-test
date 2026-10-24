import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppState, Linking, Platform } from "react-native";
import { AddDeviceDiscovery } from "../components/add-device-discovery";
import { AddDeviceProvision } from "../components/add-device-provision";
import { ProductCatalog, ProductDetails } from "../components/device/product-catalog";
import { WifiStatus } from "../components/device/wifi-status";
import {
  SystemRequirementsSheet,
  type SystemRequirement,
} from "../components/system-requirements-sheet";
import { withBudget } from "../protocol/device";
import { ApiError, type Product } from "../services/models";
import { wifiGuidance, type WifiObservation } from "../services/network-policy";
import { matchesDiscoveredProduct } from "../services/onboarding";
import { useApp } from "../ui/context";
import { Busy, Button, Card, ErrorText, Field, Label, Page, useAction } from "../ui/kit";

export default function Add() {
  const { runtime } = useApp();
  if (!runtime) return <Busy />;
  return <AddContent key={runtime.service.sessionRevision} runtime={runtime} page="discovery" />;
}
export function AddProvision() {
  const { runtime } = useApp();
  if (!runtime) return <Busy />;
  return <AddContent key={runtime.service.sessionRevision} runtime={runtime} page="provision" />;
}
function AddContent({
  runtime,
  page,
}: {
  runtime: NonNullable<ReturnType<typeof useApp>["runtime"]>;
  page: "discovery" | "provision";
}) {
  const action = useAction(),
    run = action.run;
  const { productID, boundDeviceID } = useLocalSearchParams<{
    productID?: string;
    boundDeviceID?: string;
  }>();
  const flow = useMemo(() => runtime.onboarding.acquire(), [runtime]);
  const qrFlow = useMemo(() => runtime.scanner.acquire(), [runtime]);
  const qrState = useSyncExternalStore(qrFlow.subscribe, qrFlow.snapshot, qrFlow.snapshot);
  const qrPending = qrState.phase === "confirming" || qrState.phase === "unknown";
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);
  const [choice, setChoice] = useState<Product | null>(null);
  const [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [nickname, setNickname] = useState("");
  const focused = useRef(false),
    loadController = useRef<AbortController | null>(null);
  const navigatingToProvision = useRef(false);
  const wifiController = useRef<AbortController | null>(null),
    wifiRound = useRef(0);
  const [wifi, setWifi] = useState<WifiObservation>(),
    [wifiError, setWifiError] = useState(""),
    [wifiBusy, setWifiBusy] = useState(false);
  const [dismissedRequirement, setDismissedRequirement] = useState<SystemRequirement | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const refreshWifi = useCallback(
    async (requestPermission = false) => {
      if (!runtime.wifi) return;
      wifiController.current?.abort();
      const controller = new AbortController(),
        round = ++wifiRound.current;
      wifiController.current = controller;
      setWifi(undefined);
      setWifiError("");
      setWifiBusy(true);
      setPassword("");
      setShowPassword(false);
      const check = () =>
        focused.current && !controller.signal.aborted && round === wifiRound.current;
      try {
        const current = await withBudget(
          (signal) => runtime.wifi!.read(signal, requestPermission),
          10000,
          "当前Wi-Fi读取超时",
          controller.signal,
        );
        if (check()) setWifi(current);
      } catch (error) {
        if (check()) setWifiError((error as Error).message);
      } finally {
        if (check()) setWifiBusy(false);
      }
    },
    [runtime],
  );
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      navigatingToProvision.current = false;
      if (qrPending)
        return () => {
          focused.current = false;
          flow.stop();
          setPassword("");
          setShowPassword(false);
        };
      const controller = new AbortController();
      loadController.current = controller;
      void run(async () => {
        if (boundDeviceID && !flow.state.binding) {
          const view = await runtime.service.device(boundDeviceID, controller.signal);
          if (!focused.current || controller.signal.aborted) return;
          flow.adoptBinding({
            deviceID: view.device.id,
            userID: runtime.service.userID,
            bindingRole: view.bindingRole,
          });
        }
        if (productID) {
          try {
            const product = await runtime.service.product(productID, controller.signal);
            if (!controller.signal.aborted && focused.current) {
              if (product.id !== productID) {
                throw new ApiError(502, "产品详情身份不一致，请重新选择");
              }
              flow.adoptProduct(product);
              setChoice(product);
            }
          } catch (error) {
            if (!controller.signal.aborted && focused.current) {
              setChoice(null);
              // Preserve confirmed/uncertain binding facts; only clear an unsent product choice.
              if (!flow.state.busy && !flow.state.binding && flow.state.stage !== "unknown") {
                flow.reset();
              }
            }
            throw error;
          }
        }
        if (page === "provision") {
          void refreshWifi();
        }
        if (
          page === "discovery" &&
          !productID &&
          !boundDeviceID &&
          flow.state.stage === "idle" &&
          !flow.state.message
        ) {
          void flow.scan().catch(() => undefined);
        }
      });
      const subscription = AppState.addEventListener("change", (status) => {
        if (status !== "active") {
          flow.stop();
          wifiController.current?.abort();
          setWifi(undefined);
          setPassword("");
          setShowPassword(false);
        } else if (focused.current && page === "provision") {
          void refreshWifi();
        }
      });
      return () => {
        focused.current = false;
        controller.abort();
        wifiController.current?.abort();
        loadController.current?.abort();
        subscription.remove();
        if (!(page === "discovery" && navigatingToProvision.current)) {
          flow.stop();
        }
        setPassword("");
        setShowPassword(false);
      };
    }, [runtime, productID, boundDeviceID, run, flow, refreshWifi, qrPending, page]),
  );
  const busy = state.busy || action.busy,
    product = state.product ?? choice;
  const wifiForm = !!state.candidate && !state.binding && state.stage !== "unknown";
  const nicknameForm =
    !!state.binding && state.stage !== "complete" && state.nickname === "pending";
  const error = action.error || state.error;
  const requirement: SystemRequirement | null =
    state.scanIssue === "permission"
      ? "permission"
      : state.scanIssue === "bluetooth"
        ? "bluetooth"
        : wifi && wifi.connection !== "wifi"
          ? "wifi"
          : wifi?.ssidAccess === "denied"
            ? "permission"
            : null;
  const execute = (work: () => Promise<unknown>) => void run(work);
  const choose = (selected: Product) => {
    if (page !== "discovery") return;
    if (!focused.current || (busy && state.stage !== "scanning") || state.stage === "unknown")
      return;
    flow.stop();
    setChoice(selected);
    setPassword("");
    setShowPassword(false);
  };
  const scan = () => {
    if (page !== "discovery") return;
    setDismissedRequirement(null);
    void flow.scan().catch(() => undefined);
  };
  const provision = () =>
    execute(async () => {
      try {
        await flow.provision(wifi?.ssid ?? "", password);
      } finally {
        setPassword("");
        setShowPassword(false);
      }
    });
  const finish = (value: string | null) => run(() => flow.finish(value));
  const stopCurrent = () => {
    flow.stop();
    loadController.current?.abort();
    loadController.current = new AbortController();
    wifiController.current?.abort();
    ++wifiRound.current;
    setWifiBusy(false);
    setPassword("");
    setShowPassword(false);
  };
  const returnHome = () => {
    flow.stop();
    router.replace("/home");
  };
  const requirementsSheet = (
    <SystemRequirementsSheet
      visible={!!requirement && dismissedRequirement !== requirement}
      requirement={requirement ?? "permission"}
      error={action.error}
      busy={action.busy}
      onCancel={() => setDismissedRequirement(requirement)}
      onOpenSettings={() => {
        void run(async () => {
          if (requirement === "bluetooth" && Platform.OS === "android") {
            await Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
          } else if (requirement === "wifi" && Platform.OS === "android") {
            await Linking.sendIntent("android.settings.WIFI_SETTINGS");
          } else {
            await Linking.openSettings();
          }
          setDismissedRequirement(requirement);
        });
      }}
    />
  );
  if (qrPending)
    return (
      <Page title="Add device">
        <Label>当前扫码绑定结果尚未完成，请先返回原扫码流程核对。</Label>
        <Button title="返回扫码核对结果" onPress={() => router.replace("/scan")} />
      </Page>
    );
  if (page === "discovery" && !state.binding && state.stage !== "unknown") {
    const selectionBusy = action.busy || (state.busy && state.stage !== "scanning");
    return (
      <AddDeviceDiscovery
        scanning={state.stage === "scanning"}
        devices={state.discovered.filter(
          (device) => !choice || matchesDiscoveredProduct(device, choice),
        )}
        products={catalogProducts}
        disabled={selectionBusy}
        error={state.scanIssue === "timeout" || requirement ? undefined : error}
        onBack={() => {
          flow.stop();
          if (router.canGoBack()) router.back();
          else router.replace("/home");
        }}
        onRescan={scan}
        onSelect={(device) => {
          execute(async () => {
            flow.stop();
            await flow.select(device, choice?.id);
            if (focused.current) {
              navigatingToProvision.current = true;
              const selectedProductID = flow.snapshot().product?.id;
              router.push({
                pathname: "/add-provision",
                params: selectedProductID ? { productID: selectedProductID } : undefined,
              });
            }
          });
        }}
        catalog={
          <ProductCatalog
            service={runtime.service}
            disabled={selectionBusy}
            onChoose={choose}
            onProducts={setCatalogProducts}
          />
        }
        sheet={requirementsSheet}
      />
    );
  }
  if (page === "provision") {
    return (
      <AddDeviceProvision
        state={state}
        product={product ?? undefined}
        wifi={wifi}
        wifiBusy={wifiBusy}
        ssid={wifi?.ssid ?? ""}
        password={password}
        nickname={nickname}
        busy={busy}
        error={error}
        wifiError={wifiError}
        onPasswordChange={setPassword}
        onNicknameChange={(value) => setNickname([...value].slice(0, 20).join(""))}
        onRefreshWifi={() => void refreshWifi(true)}
        onProvision={provision}
        onFinish={finish}
        onRetryProvision={() => {
          setPassword("");
          setShowPassword(false);
        }}
        onBack={() => {
          flow.stop();
          if (router.canGoBack()) router.back();
          else router.replace("/home");
        }}
        onDone={returnHome}
        service={{
          rooms: async () => (await runtime.service.rooms()).rooms,
          moveDevice: (id, roomID) => runtime.service.moveDevice(id, roomID),
        }}
      />
    );
  }
  return (
    <Page title="Add device">
      {!wifiForm && !nicknameForm && <ErrorText error={error} />}
      {!state.binding && (
        <>
          {product && (
            <Card>
              <ProductDetails product={product} />
              {!wifiForm && (
                <Button
                  secondary
                  title="Pairing help"
                  disabled={busy}
                  onPress={() =>
                    router.push({
                      pathname: "/help",
                      params: { id: product.id, product: "true" },
                    })
                  }
                />
              )}
            </Card>
          )}
          {wifiForm && (
            <>
              <Label muted>Use a 2.4 GHz Wi-Fi network. Keep your device in pairing mode.</Label>
              <WifiStatus />
              <>
                <Label muted>
                  {wifi
                    ? wifiGuidance(wifi)
                    : wifiBusy
                      ? "正在读取当前Wi-Fi"
                      : "请读取当前Wi-Fi后输入密码。"}
                </Label>
                <Field label="Current Wi-Fi name" value={wifi?.ssid ?? ""} editable={false} />
                <Button
                  secondary
                  title="Read current Wi-Fi"
                  disabled={busy || wifiBusy}
                  onPress={() => void refreshWifi(true)}
                />
                <ErrorText error={wifiError} />
              </>
              <Field
                label="Wi-Fi password"
                secureTextEntry={!showPassword}
                value={password}
                editable={!busy}
                onChangeText={setPassword}
              />
              <Button
                secondary
                title={showPassword ? "隐藏密码" : "显示密码"}
                disabled={busy}
                onPress={() => setShowPassword((value) => !value)}
              />
              <ErrorText error={error} />
              <Button
                title={busy ? "Pairing…" : "Connect device"}
                disabled={busy || !wifi?.ssid || wifiBusy}
                onPress={provision}
              />
              {product && (
                <Button
                  secondary
                  title="Pairing help"
                  disabled={busy}
                  onPress={() =>
                    router.push({
                      pathname: "/help",
                      params: { id: product.id, product: "true" },
                    })
                  }
                />
              )}
            </>
          )}
          {state.stage === "unknown" && (
            <Button
              title="核对绑定结果"
              disabled={busy}
              onPress={() => execute(() => flow.reconcile())}
            />
          )}
          {product && state.stage !== "unknown" && (
            <Button
              secondary
              disabled={busy}
              title="Choose another product"
              onPress={() => {
                flow.reset();
                setChoice(null);
                setPassword("");
              }}
            />
          )}
        </>
      )}
      {!!state.message && (
        <Card>
          <Label>{state.message}</Label>
          {state.deviceStep && (state.error || state.stage === "unknown") && (
            <Label muted>{state.deviceStep}</Label>
          )}
          {busy && <Busy />}
        </Card>
      )}
      {busy && <Button secondary title="停止当前客户端操作" onPress={stopCurrent} />}
      {state.binding && state.stage !== "complete" && (
        <>
          <Label muted>绑定已确认；昵称或首页刷新失败不会重新配网。</Label>
          {state.nickname === "pending" && (
            <>
              <Field
                label="Device nickname (optional)"
                value={nickname}
                editable={!busy && !state.nicknameUnknown}
                onChangeText={setNickname}
              />
              <ErrorText error={error} />
            </>
          )}
          <Button
            title={
              state.nicknameUnknown
                ? "Check nickname result"
                : state.nickname === "pending"
                  ? "Finish"
                  : "重试添加结果"
            }
            disabled={busy}
            onPress={() => finish(state.nickname === "pending" ? nickname : null)}
          />
          {state.nickname === "pending" && !state.nicknameUnknown && (
            <Button secondary title="Skip nickname" disabled={busy} onPress={() => finish(null)} />
          )}
        </>
      )}
      {state.binding && state.realtime === "failed" && (
        <Card>
          <ErrorText error={`设备已绑定，实时连接未完成：${state.realtimeError}`} />
          <Button
            secondary
            title="重试实时连接"
            disabled={busy || !state.visible}
            onPress={() => execute(() => flow.retryRealtime())}
          />
        </Card>
      )}
      {state.stage === "complete" && (
        <Button title="返回首页" disabled={busy} onPress={returnHome} />
      )}
      {requirementsSheet}
    </Page>
  );
}
