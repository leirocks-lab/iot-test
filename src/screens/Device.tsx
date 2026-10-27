import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeviceEvents } from "../components/device/event-controls";
import { withBudget } from "../protocol/device";
import type { DeviceSession } from "../protocol/device-session";
import type { DeviceView } from "../services/models";
import { useApp } from "../ui/context";
import { Busy, Button, ErrorText, Page, useAction } from "../ui/kit";
export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { runtime } = useApp(),
    action = useAction(),
    [device, setDevice] = useState<DeviceView | null>(null),
    [shadow, setShadow] = useState<DeviceSession | null>(null),
    [, redraw] = useState(0);
  const retryRef = useRef<() => Promise<void>>(async () => undefined);
  const [detailError, setDetailError] = useState("");
  const sessionRevision = runtime?.service.sessionRevision;
  useFocusEffect(
    useCallback(() => {
      if (!runtime?.service.session || sessionRevision === undefined) return;
      let active = true,
        foreground = AppState.currentState === null || AppState.currentState === "active";
      const owner = runtime.service.userID;
      const current = () =>
        active &&
        foreground &&
        runtime.service.session?.userID === owner &&
        runtime.service.sessionRevision === sessionRevision;
      setDevice(null);
      setDetailError("");
      const session = runtime.createDeviceSession(id);
      setShadow(session);
      const unsub = session.onChange(() => {
        if (active) redraw((n) => n + 1);
      });
      let controller: AbortController | undefined, flight: Promise<void> | undefined;
      const stop = () => {
        const previous = controller;
        controller = undefined;
        previous?.abort();
        flight = undefined;
      };
      const refresh = (): Promise<void> => {
        if (!current()) return Promise.resolve();
        if (flight) return flight;
        const attempt = new AbortController();
        controller = attempt;
        setDetailError("");
        const valid = () => current() && !attempt.signal.aborted && controller === attempt;
        const task = (async () => {
          const data = await withBudget(
            (signal) => runtime.service.device(id, signal),
            10000,
            "鐠佹儳顦拠锔藉剰閸掗攱鏌婄搾鍛閿涘矁顕柌宥堢槸",
            attempt.signal,
          );
          if (!valid()) return;
          setDevice(data);
          // A missing model must not hide metadata or manufacture realtime values.
          const modelTask = (async () => {
            if (!data.product) throw new Error("Product information unavailable");
            const nextModel = await withBudget(
              (signal) => runtime.service.model(data.product!.id, signal),
              10000,
              "Model request timed out",
              attempt.signal,
            );
            if (valid()) void nextModel;
          })();
          const results = await Promise.allSettled([modelTask, session.connect(attempt.signal)]);
          if (valid()) {
            const failure = results.find((result) => result.status === "rejected");
            if (failure?.status === "rejected") throw failure.reason;
          }
        })()
          .catch((error) => {
            if (valid()) setDetailError(error instanceof Error ? error.message : String(error));
          })
          .finally(() => {
            if (flight === task) flight = undefined;
          });
        flight = task;
        return task;
      };
      retryRef.current = refresh;
      void refresh();
      const app = AppState.addEventListener("change", (state) => {
        foreground = state === "active";
        if (foreground) void refresh();
        // Runtime owns MQTT while backgrounded; cancel only page metadata work.
        else {
          controller?.abort();
          controller = undefined;
          flight = undefined;
        }
      });
      return () => {
        active = false;
        stop();
        unsub();
        app.remove();
        retryRef.current = async () => undefined;
      };
    }, [runtime, id, sessionRevision]),
  );
  const controls = shadow?.controls;
  const views = controls?.list() ?? [];
  const power = views.find((v) => v.kind === "power");
  const lock = views.find((v) => v.kind === "childLock");
  const light = views.find((v) => v.kind === "light");
  const temperature = views.find((v) => v.kind === "temperature");
  const unit = runtime?.service.session?.setting.temperatureUnit ?? "C";
  const temp = typeof temperature?.value === "number" ? temperature.value : 35;
  const insets = useSafeAreaInsets();
  const toggle = (kind: "power" | "light" | "childLock") => {
    if (controls) void action.run(() => controls.toggle(kind));
  };
  const adjust = (delta: number) => {
    if (controls && temperature && typeof temperature.value === "number")
      void action.run(() =>
        controls.submit("temperature", String((temperature.value as number) + delta), unit),
      );
  };
  const footer = (
    <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={ui.footerItems}>
        <Pressable
          onPress={() => toggle("power")}
          disabled={!power || !!power.reason}
          style={ui.footerItem}
        >
          <Image
            source={
              controls?.isOn("power")
                ? require("../../assets/images/poweron-icon.png")
                : require("../../assets/images/poweroff-icon.png")
            }
            style={ui.footerIcon}
          />
          <Text style={ui.footerText}>{"\u5f00\u5173"}</Text>
        </Pressable>
        <Pressable
          onPress={() => toggle("childLock")}
          disabled={!lock || !!lock.reason}
          style={ui.footerItem}
        >
          <Image
            source={
              controls?.isOn("childLock")
                ? require("../../assets/images/child-lock-white.png")
                : require("../../assets/images/child-lock-black.png")
            }
            style={ui.footerIcon}
          />
          <Text style={ui.footerText}>{"\u7ae5\u9501"}</Text>
        </Pressable>
      </View>
      <View style={ui.indicator} />
    </View>
  );
  return (
    <Page
      title={device?.deviceNickname ?? "Device"}
      action={
        <Button
          secondary
          title="More"
          onPress={() => router.push({ pathname: "/device/[id]/more", params: { id } })}
        />
      }
      footer={footer}
    >
      <ErrorText error={action.error} />
      <ErrorText error={detailError || shadow?.error || ""} />
      <ErrorText error={shadow?.controlError || ""} />
      {!device ? (
        <>
          <Busy />
          <Button
            secondary
            title="Retry"
            onPress={() => void action.run(() => retryRef.current())}
          />
        </>
      ) : (
        <>
          <View style={ui.status}>
            <View style={[ui.dot, { backgroundColor: shadow?.connected ? "#00C08C" : "#999" }]} />
            <Text style={ui.statusText}>{shadow?.connected ? "Cooling" : "Powered off"}</Text>
          </View>
          <View style={ui.preview}>
            <View style={ui.previewLine} />
            <Image
              source={require("../../assets/images/device-control/device-fridge-outline.png")}
              style={ui.fridge}
            />
          </View>
          <View style={ui.units}>
            <View style={ui.selected}>
              <Text style={ui.selectedText}>°C</Text>
            </View>
            <Text style={ui.unitText}>°F</Text>
          </View>
          <View style={ui.tempCard}>
            <TempRow
              value={temp}
              label="Left zone"
              minus={() => adjust(-1)}
              plus={() => adjust(1)}
            />
            <TempRow
              value={temp + 5}
              label="Right zone"
              minus={() => adjust(-1)}
              plus={() => adjust(1)}
            />
          </View>
          <View style={ui.lightCard}>
            <View style={ui.lightHeader}>
              <Text style={ui.title}>Light</Text>
              <Pressable onPress={() => toggle("light")} disabled={!light || !!light.reason}>
                <View style={[ui.switch, controls?.isOn("light") ? ui.switchOn : ui.switchOff]}>
                  <View style={ui.thumb} />
                </View>
              </Pressable>
            </View>
            <View style={ui.colors}>
              <View
                style={[
                  ui.color,
                  { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E5E5" },
                ]}
              />
              <View style={[ui.color, { backgroundColor: "#EE9D31" }]} />
              <View style={[ui.color, { backgroundColor: "#2D98EA" }]} />
            </View>
            <View style={ui.brightness}>
              <Text style={ui.body}>Brightness</Text>
              <Text style={ui.body}>30%</Text>
            </View>
            <View style={ui.options}>
              <Text style={ui.active}>30%</Text>
              <Text style={ui.option}>60%</Text>
              <Text style={ui.option}>100%</Text>
            </View>
          </View>
          <ErrorText error={shadow?.eventError || ""} />
          {shadow?.events && <DeviceEvents events={shadow.events} />}
          <View style={{ height: 30 }} />
        </>
      )}
    </Page>
  );
}
function TempRow({
  value,
  label,
  minus,
  plus,
}: {
  value: number;
  label: string;
  minus: () => void;
  plus: () => void;
}) {
  return (
    <View style={ui.row}>
      <Pressable onPress={minus} style={ui.button}>
        <Text style={ui.math}>−</Text>
      </Pressable>
      <View style={ui.value}>
        <View style={ui.numberRow}>
          <Text style={ui.number}>{value}</Text>
          <Text style={ui.degree}>°C</Text>
        </View>
        <Text style={ui.label}>{label}</Text>
      </View>
      <Pressable onPress={plus} style={ui.button}>
        <Text style={ui.math}>＋</Text>
      </Pressable>
    </View>
  );
}
const ui = {
  footer: { backgroundColor: "rgba(242,242,242,.96)", paddingTop: 8 },
  footerItems: {
    height: 78,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 95,
  },
  footerItem: { alignItems: "center" as const, width: 48 },
  footerIcon: { width: 48, height: 48 },
  footerText: { fontSize: 12, color: "#666", marginTop: 7 },
  indicator: {
    height: 4,
    width: 134,
    borderRadius: 2,
    backgroundColor: "#000",
    alignSelf: "center" as const,
    marginTop: 8,
  },
  status: {
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 17,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 14, color: "#666" },
  preview: {
    height: 250,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    marginTop: 14,
  },
  previewLine: {
    width: 142,
    height: 10,
    borderRadius: 8,
    backgroundColor: "#2D2927",
    opacity: 0.35,
  },
  fridge: { width: 143, height: 210 },
  units: {
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    width: 136,
    height: 44,
    borderRadius: 25,
    backgroundColor: "rgba(229,229,229,.3)",
    padding: 4,
    marginTop: 28,
  },
  selected: {
    width: 64,
    height: 36,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.7)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selectedText: { fontSize: 14, fontWeight: "600" as const },
  unitText: { flex: 1, textAlign: "center" as const, fontSize: 14, color: "#666" },
  tempCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: 32,
    gap: 28,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  button: {
    width: 37,
    height: 37,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  math: { fontSize: 32 },
  value: { alignItems: "center" as const },
  numberRow: { flexDirection: "row" as const, alignItems: "baseline" as const },
  number: { fontSize: 36, fontWeight: "700" as const },
  degree: { fontSize: 16, fontWeight: "700" as const, marginLeft: 6 },
  label: { fontSize: 12, color: "#666", marginTop: 5 },
  lightCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16, marginTop: 12 },
  lightHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  title: { fontSize: 16 },
  switch: {
    width: 48,
    height: 24,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center" as const,
  },
  switchOn: { backgroundColor: "#186DAF" },
  switchOff: { backgroundColor: "#E5E5E5", alignItems: "flex-end" as const },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF" },
  colors: { flexDirection: "row" as const, justifyContent: "space-around" as const, marginTop: 26 },
  color: { width: 42, height: 42, borderRadius: 21 },
  brightness: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 20,
  },
  body: { fontSize: 14, color: "#333" },
  options: { flexDirection: "row" as const, gap: 10, marginTop: 14 },
  active: {
    backgroundColor: "rgba(24,109,175,.1)",
    borderRadius: 18,
    color: "#186DAF",
    fontSize: 14,
    paddingVertical: 11,
    paddingHorizontal: 28,
  },
  option: {
    backgroundColor: "#F2F2F2",
    borderRadius: 18,
    color: "#666",
    fontSize: 14,
    paddingVertical: 11,
    paddingHorizontal: 25,
  },
};
