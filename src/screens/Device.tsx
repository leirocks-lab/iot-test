import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeviceEvents } from "../components/device/event-controls";
import { createMockDeviceSession, mockDeviceView } from "../dev/mock-device";
import { withBudget } from "../protocol/device";
import type { DeviceSession } from "../protocol/device-session";
import type { DeviceView } from "../services/models";
import { useApp, useColors } from "../ui/context";
import { Busy, Button, ErrorText, Page, useAction } from "../ui/kit";
export default function DeviceScreen() {
  const colors = useColors();
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
      if (__DEV__) {
        const session = createMockDeviceSession();
        setDevice(mockDeviceView(id));
        setDetailError("");
        setShadow(session);
        const unsub = session.onChange(() => redraw((n) => n + 1));
        retryRef.current = async () => undefined;
        return () => {
          unsub();
          session.close();
          retryRef.current = async () => undefined;
        };
      }
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
        session.close();
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
        else stop();
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
  const configuredUnit = runtime?.service.session?.setting.temperatureUnit ?? "C";
  const [displayUnit, setDisplayUnit] = useState<"C" | "F">(configuredUnit);
  const [lightColor, setLightColor] = useState<"white" | "orange" | "blue">("blue");
  const [brightness, setBrightness] = useState<30 | 60 | 100>(30);
  const unit = displayUnit;
  const rawTemp = typeof temperature?.value === "number" ? temperature.value : 35;
  const temp = displayUnit === "F" ? (rawTemp * 9) / 5 + 32 : rawTemp;
  const insets = useSafeAreaInsets();
  const toggle = (kind: "power" | "light" | "childLock") => {
    if (controls) void action.run(() => controls.toggle(kind));
  };
  const adjust = (delta: number) => {
    if (controls && temperature && typeof temperature.value === "number")
      void action.run(() => controls.submit("temperature", String(temp + delta), unit));
  };
  const changeUnit = (next: "C" | "F") => {
    if (next === displayUnit) return;
    setDisplayUnit(next);
    if (runtime) {
      void action.run(async () => {
        await runtime.service.updateSettings({ temperatureUnit: next });
      });
    }
  };
  const footer = (
    <View style={[ui.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={ui.footerItems}>
        <Pressable
          onPress={() => toggle("power")}
          disabled={!power || !!power.reason}
          style={ui.footerItem}
        >
          <View
            style={[
              ui.footerItemIcon,
              { backgroundColor: controls?.isOn("power") ? colors.brand.blue : undefined },
            ]}
          >
            <Image
              source={
                controls?.isOn("power")
                  ? require("../../assets/images/poweron-icon.png")
                  : require("../../assets/images/poweroff-icon.png")
              }
              style={ui.footerIcon}
            />
          </View>
          <Text style={ui.footerText}>开关</Text>
        </Pressable>
        <Pressable
          onPress={() => toggle("childLock")}
          disabled={!lock || !!lock.reason}
          style={ui.footerItem}
        >
          <View
            style={[
              ui.footerItemIcon,
              { backgroundColor: controls?.isOn("childLock") ? colors.brand.blue : undefined },
            ]}
          >
            <Image
              source={
                controls?.isOn("childLock")
                  ? require("../../assets/images/child-lock-white.png")
                  : require("../../assets/images/child-lock-black.png")
              }
              style={ui.footerIcon}
            />
          </View>
          <Text style={ui.footerText}>童锁</Text>
        </Pressable>
      </View>
      <View style={ui.indicator} />
    </View>
  );
  return (
    <Page
      title={device?.deviceNickname ?? "设备"}
      header={
        <View style={ui.header}>
          <Pressable
            style={ui.headerButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
          >
            <Image source={require("../../assets/images/back-icon.png")} style={ui.headerIcon} />
          </Pressable>
          <Text style={ui.headerTitle}>酒柜</Text>
          <Pressable
            style={ui.headerButton}
            onPress={() => router.push({ pathname: "/device/[id]/more", params: { id } })}
          >
            <Image source={require("../../assets/images/more-icon.png")} style={ui.headerIcon} />
          </Pressable>
        </View>
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
          <View style={ui.preview}>
            <Image
              source={require("../../assets/images/device-control/device-fridge-outline.png")}
              style={ui.fridge}
            />
          </View>
          <View style={ui.controlCard}>
            <View style={[ui.units, { backgroundColor: colors.background.control }]}>
              {(["C", "F"] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[ui.unitTextWrap, displayUnit === option && ui.selected]}
                  onPress={() => changeUnit(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: displayUnit === option }}
                >
                  <Text style={[ui.unitText, displayUnit === option && ui.selectedText]}>
                    °{option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TempRow
              value={temp}
              unit={displayUnit}
              label={`左温区温度设置（当前 ${Math.round(temp)}°${displayUnit}）`}
              minus={() => adjust(-1)}
              plus={() => adjust(1)}
            />
            <TempRow
              value={temp + 5}
              unit={displayUnit}
              label={`右温区温度设置（当前 ${Math.round(temp + 5)}°${displayUnit}）`}
              minus={() => adjust(-1)}
              plus={() => adjust(1)}
            />
          </View>
          <View style={ui.lightCard}>
            <View style={ui.lightHeader}>
              <View style={ui.lightLabel}>
                <Image
                  source={require("../../assets/images/device-control/light-icon.png")}
                  style={ui.lightIcon}
                />
                <Text style={ui.title}>灯光</Text>
              </View>
              <LightSwitch
                value={!!controls?.isOn("light")}
                disabled={!light || !!light.reason}
                onValueChange={() => toggle("light")}
              />
            </View>
            {!!controls?.isOn("light") && (
              <>
                <View style={ui.lightDivider} />
                <View style={ui.colors}>
                  <Pressable style={ui.colorChoice} onPress={() => setLightColor("white")}>
                    <View
                      style={[
                        ui.color,
                        ui.whiteColor,
                        lightColor === "white" && ui.colorChoiceSelected,
                      ]}
                    >
                      {lightColor === "white" && (
                        <Image
                          source={require("../../assets/images/light-gray.png")}
                          style={ui.colorSelectionIcon}
                        />
                      )}
                    </View>
                    <Text style={[ui.colorLabel, lightColor === "white" && ui.colorLabelSelected]}>
                      白色
                    </Text>
                  </Pressable>
                  <Pressable style={ui.colorChoice} onPress={() => setLightColor("orange")}>
                    <View
                      style={[
                        ui.color,
                        ui.orangeColor,
                        lightColor === "orange" && ui.colorChoiceSelected,
                      ]}
                    >
                      {lightColor === "orange" && (
                        <Image
                          source={require("../../assets/images/light-white.png")}
                          style={ui.colorSelectionIcon}
                        />
                      )}
                    </View>
                    <Text style={[ui.colorLabel, lightColor === "orange" && ui.colorLabelSelected]}>
                      琥珀色
                    </Text>
                  </Pressable>
                  <Pressable style={ui.colorChoice} onPress={() => setLightColor("blue")}>
                    <View
                      style={[
                        ui.color,
                        ui.blueColor,
                        lightColor === "blue" && ui.colorChoiceSelected,
                      ]}
                    >
                      {lightColor === "blue" && (
                        <Image
                          source={require("../../assets/images/light-white.png")}
                          style={ui.colorSelectionIcon}
                        />
                      )}
                    </View>
                    <Text style={[ui.colorLabel, lightColor === "blue" && ui.colorLabelSelected]}>
                      蓝色
                    </Text>
                  </Pressable>
                </View>
                <View style={ui.brightnessHeader}>
                  <Text style={ui.body}>灯光亮度</Text>
                  <Text style={ui.body}>{brightness}%</Text>
                </View>
                <View style={ui.options}>
                  {([30, 60, 100] as const).map((option) => (
                    <Pressable
                      key={option}
                      style={[ui.option, brightness === option && ui.active]}
                      onPress={() => setBrightness(option)}
                    >
                      <Text style={[ui.optionText, brightness === option && ui.activeText]}>
                        {option}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
          {shadow?.eventError && <ErrorText error={shadow.eventError} />}
          {shadow?.events && <DeviceEvents events={shadow.events} />}
          <View style={{ height: 30 }} />
        </>
      )}
    </Page>
  );
}
function TempRow({
  value,
  unit,
  label,
  minus,
  plus,
}: {
  value: number;
  unit: "C" | "F";
  label: string;
  minus: () => void;
  plus: () => void;
}) {
  const colors = useColors();
  return (
    <View>
      <Text style={[ui.label, { color: colors.font.subtitle }]}>{label}</Text>
      <View style={ui.row}>
        <Pressable
          onPress={minus}
          style={[ui.button, { backgroundColor: colors.background.split, borderRadius: 37 }]}
        >
          <Image
            source={require("../../assets/images/control-subtract.png")}
            style={ui.controlIcon}
          />
        </Pressable>
        <View style={ui.value}>
          <View style={ui.numberRow}>
            <Text style={ui.number}>{Math.round(value)}</Text>
            <Text style={ui.degree}>°{unit}</Text>
          </View>
        </View>
        <Pressable
          onPress={plus}
          style={[ui.button, { backgroundColor: colors.background.split, borderRadius: 37 }]}
        >
          <Image source={require("../../assets/images/control-add.png")} style={ui.controlIcon} />
        </Pressable>
      </View>
    </View>
  );
}

function LightSwitch({
  value,
  disabled,
  onValueChange,
}: {
  value: boolean;
  disabled?: boolean;
  onValueChange: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={onValueChange}
      style={ui.lightSwitchHitTarget}
    >
      <View
        style={[
          ui.lightSwitchTrack,
          value ? ui.lightSwitchTrackOn : ui.lightSwitchTrackOff,
          disabled && ui.lightSwitchTrackDisabled,
        ]}
      >
        <View style={ui.lightSwitchThumb} />
      </View>
    </Pressable>
  );
}

const ui = {
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerIcon: { width: 28, height: 28 },
  headerTitle: { fontSize: 17, fontWeight: "600" as const, color: "#111" },
  footer: { backgroundColor: "rgba(242,242,242,.96)", paddingTop: 8 },
  footerItems: {
    height: 78,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 95,
  },
  footerItem: { alignItems: "center" as const, width: 48 },
  footerItemIcon: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  footerIcon: { width: 32, height: 32 },
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
    height: 210,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  previewLine: {
    width: 142,
    height: 10,
    borderRadius: 8,
    backgroundColor: "#2D2927",
    opacity: 0.35,
  },
  fridge: { width: 143, height: 210, marginBottom: -36 },
  units: {
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    width: 136,
    height: 44,
    borderRadius: 25,
    padding: 4,
  },
  unitTextWrap: {
    width: 64,
    height: 36,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selectedText: { fontSize: 14, fontWeight: "600" as const },
  selected: { backgroundColor: "#FFF" },
  unitText: { textAlign: "center" as const, fontSize: 14, color: "#666" },
  controlCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 27,
    paddingHorizontal: 16,
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
  controlIcon: { width: 24, height: 24 },
  value: { alignItems: "center" as const },
  numberRow: { flexDirection: "row" as const, alignItems: "baseline" as const },
  number: { fontSize: 36, fontWeight: "700" as const },
  degree: { fontSize: 16, fontWeight: "700" as const, marginLeft: 6 },
  label: { fontSize: 12, marginBottom: 20 },
  lightCard: { backgroundColor: "#FFF", borderRadius: 12, padding: 16 },
  lightHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  lightLabel: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
  lightIcon: { width: 22, height: 22, resizeMode: "contain" as const },
  title: { fontSize: 16, color: "#222" },
  lightDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginTop: 16,
  },
  colors: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  colorChoice: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: 64,
  },
  colorChoiceSelected: { borderWidth: 1, borderColor: "#DCEBFA" },
  color: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  whiteColor: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#DDD" },
  orangeColor: { backgroundColor: "#F39A28" },
  blueColor: { backgroundColor: "#2D98EA" },
  colorSelectionIcon: { width: 20, height: 20, position: "absolute" as const },
  colorLabel: { marginTop: 8, fontSize: 11, color: "#999" },
  colorLabelSelected: { color: "#333", fontWeight: "600" as const },
  brightnessHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 14,
  },
  brightness: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: 20,
  },
  body: { fontSize: 14, color: "#333" },
  options: { flexDirection: "row" as const, gap: 8, marginTop: 12 },
  active: {
    backgroundColor: "#E8F3FB",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optionText: { color: "#999", fontSize: 12, textAlign: "center" as const },
  activeText: { color: "#1677FF" },
  option: {
    backgroundColor: "#F2F2F2",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: "center" as const,
  },
  lightSwitchHitTarget: {
    width: 48,
    height: 32,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
  },
  lightSwitchTrack: {
    width: 48,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center" as const,
  },
  lightSwitchTrackOn: {
    backgroundColor: "#227DBB",
    alignItems: "flex-end" as const,
  },
  lightSwitchTrackOff: {
    backgroundColor: "#D9D9D9",
    alignItems: "flex-start" as const,
  },
  lightSwitchTrackDisabled: {
    opacity: 0.65,
  },
  lightSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
};
