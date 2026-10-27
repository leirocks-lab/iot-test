import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { DeviceView } from "../services/models";
import type { ScanDestination } from "../services/scan-flow";
import { useApp } from "../ui/context";
import { Busy, Button, Label, Page, useAction } from "../ui/kit";

export default function Scan() {
  const { runtime } = useApp();
  if (!runtime) return <Busy />;
  return <ScanContent key={runtime.service.sessionRevision} runtime={runtime} />;
}

function ScanContent({ runtime }: { runtime: NonNullable<ReturnType<typeof useApp>["runtime"]> }) {
  const action = useAction();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const flow = useMemo(() => runtime.scanner.acquire(), [runtime]);
  const addFlow = useMemo(() => runtime.onboarding.acquire(), [runtime]);
  const addState = useSyncExternalStore(addFlow.subscribe, addFlow.snapshot, addFlow.snapshot);
  const state = useSyncExternalStore(flow.subscribe, flow.snapshot, flow.snapshot);
  const [active, setActive] = useState(false);
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState("");
  const [resultDevices, setResultDevices] = useState<DeviceView[] | null>(null);
  const [resultDeviceID, setResultDeviceID] = useState("");
  const focused = useRef(false);
  const pickingRef = useRef(false);
  const permissionAttempt = useRef(0);
  const albumRound = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanLine] = useState(() => new Animated.Value(0));
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frameSize = Math.min(width * 0.65, height * 0.38, 280);
  const frameTop = 56 + insets.top + Math.max(28, height * 0.09) + 14;
  const sideWidth = (width - frameSize) / 2;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const readCodes = (values: readonly string[]) => {
    flow.read(values);
    if (flow.state.error && flow.state.phase === "idle") {
      showToast(flow.state.error);
      flow.reset();
    }
  };

  useEffect(() => {
    if (!active || !permission?.granted || picking || resultDevices) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: frameSize - 3,
          duration: 2200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      scanLine.setValue(0);
    };
  }, [active, frameSize, permission?.granted, picking, resultDevices, scanLine]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      permissionAttempt.current++;
      const attempt = permissionAttempt.current;
      setActive(AppState.currentState === "active");
      void refreshPermission().then(async (current) => {
        if (!focused.current || permissionAttempt.current !== attempt || current.granted) return;
        const result = current.canAskAgain ? await requestPermission() : current;
        if (result.granted || !focused.current || permissionAttempt.current !== attempt) return;
        showToast("暂无相机权限");
        setTimeout(() => {
          if (focused.current && permissionAttempt.current === attempt) {
            focused.current = false;
            flow.stop();
            if (router.canGoBack()) router.back();
            else router.replace("/home");
          }
        }, 1800);
      });
      const subscription = AppState.addEventListener("change", (status) => {
        setActive(status === "active");
        if (status !== "active" && !pickingRef.current) {
          albumRound.current++;
          flow.stop();
        }
        if (status === "active") void refreshPermission();
      });
      return () => {
        focused.current = false;
        permissionAttempt.current++;
        albumRound.current++;
        setActive(false);
        flow.stop();
        subscription.remove();
      };
    }, [flow, refreshPermission, requestPermission, showToast]),
  );

  const showDestination = async (destination: ScanDestination) => {
    if (!focused.current) return;
    if ("binding" in destination) {
      setResultDeviceID(destination.binding.deviceID);
      setResultDevices([]);
      const groups = await runtime.service.home();
      if (!focused.current) return;
      const matched = groups
        .flatMap((group) => group.devices)
        .filter((device) => device.device.id === destination.binding.deviceID);
      if (!matched.length) throw new Error("设备绑定成功，但设备列表暂未返回该设备，请稍后核对");
      setResultDevices(matched);
    } else {
      router.replace({
        pathname: "/add-provision",
        params: { productID: destination.productID },
      });
    }
  };

  const pickPhoto = () =>
    void action.run(async () => {
      const round = ++albumRound.current;
      pickingRef.current = true;
      setPicking(true);
      try {
        const photo = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          allowsEditing: false,
          quality: 1,
        });
        if (!focused.current || round !== albumRound.current || photo.canceled) return;
        const scanned = await Camera.scanFromURLAsync(photo.assets[0].uri, ["qr"]);
        if (focused.current && round === albumRound.current)
          readCodes(scanned.map((code) => code.data));
        if (!scanned.length && focused.current && round === albumRound.current)
          showToast("未识别到二维码，请重新选择图片");
      } catch (error) {
        if (focused.current && round === albumRound.current)
          showToast(error instanceof Error ? error.message : "图片识别失败，请重试");
      } finally {
        pickingRef.current = false;
        if (focused.current) {
          setPicking(false);
          // The picker promise resolves after returning to this screen; AppState can
          // still briefly report inactive while its transition event is in flight.
          setActive(true);
        }
      }
    });

  if (resultDevices)
    return (
      <ResultList
        devices={resultDevices}
        onBack={() => router.replace("/home")}
        onRetry={() =>
          void action.run(async () => {
            try {
              const groups = await runtime.service.home();
              const matched = groups
                .flatMap((group) => group.devices)
                .filter((device) => device.device.id === resultDeviceID);
              if (!matched.length)
                throw new Error("设备绑定成功，但设备列表暂未返回该设备，请稍后重试");
              setResultDevices(matched);
            } catch (error) {
              showToast(error instanceof Error ? error.message : "设备列表加载失败");
            }
          })
        }
      />
    );

  const confirming = state.phase === "confirming";
  if (addState.stage === "unknown" || addState.binding) {
    return (
      <Page title="Scan QR code">
        <Label>当前设备还有待完成的添加结果，请先处理当前事务。</Label>
        <Button title="返回当前添加流程" onPress={() => router.replace("/add-provision")} />
      </Page>
    );
  }

  return (
    <View style={styles.scanner}>
      <StatusBar hidden />
      {active && permission?.granted && !resultDevices && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => {
            if (focused.current && !pickingRef.current) readCodes([data]);
          }}
          onMountError={({ message }) => showToast(message)}
        />
      )}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.scrim, { left: 0, top: 0, width, height: frameTop }]} />
        <View
          style={[styles.scrim, { left: 0, top: frameTop, width: sideWidth, height: frameSize }]}
        />
        <View
          style={[
            styles.scrim,
            {
              right: 0,
              top: frameTop,
              width: sideWidth,
              height: frameSize,
            },
          ]}
        />
        <View
          style={[
            styles.scrim,
            {
              left: 0,
              top: frameTop + frameSize,
              width,
              height: Math.max(0, height - frameTop - frameSize),
            },
          ]}
        />
      </View>

      <View style={styles.safeOverlay}>
        <View style={[styles.scanHeader, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
            style={styles.backButton}
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
          <Text style={styles.scanTitle}>扫一扫</Text>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.scanArea, { marginTop: Math.max(28, height * 0.09) + 14 }]}>
          <View style={[styles.scanFrame, { width: frameSize, height: frameSize }]}>
            {[
              ["top", "left"],
              ["top", "right"],
              ["bottom", "left"],
              ["bottom", "right"],
            ].map(([vertical, horizontal]) => (
              <View
                key={`${vertical}-${horizontal}`}
                style={[
                  styles.corner,
                  styles[`corner_${vertical}_${horizontal}` as keyof typeof styles] as object,
                ]}
              />
            ))}
            {active && permission?.granted && state.phase === "idle" && !picking && (
              <Animated.View
                style={[
                  styles.scanBeam,
                  { width: frameSize },
                  { transform: [{ translateY: scanLine }] },
                ]}
              >
                <Svg width={frameSize} height={2} viewBox={`0 0 ${frameSize} 2`}>
                  <Defs>
                    <LinearGradient id="scanBeamGradient" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#EE9D31" stopOpacity={0} />
                      <Stop offset="40.76%" stopColor="#EE9D31" />
                      <Stop offset="50.01%" stopColor="#FFE9CC" />
                      <Stop offset="59.83%" stopColor="#EE9D31" />
                      <Stop offset="100%" stopColor="#EE9D31" stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width={frameSize} height="2" fill="url(#scanBeamGradient)" />
                </Svg>
              </Animated.View>
            )}
          </View>
        </View>
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>扫描设备二维码</Text>
          <Text style={styles.instructionBody}>在配件、包装或说明书上查找产品二维码，</Text>
          <Text style={styles.instructionBody}>并将其放在上方相机取景框内</Text>
        </View>
        {state.phase === "choosing" || state.phase === "unknown" ? (
          <View style={styles.choices}>
            {state.choices.map((choice, index) => (
              <Button
                key={`${choice.type}-${choice.label}-${index}`}
                title={`${choice.type === "share" ? "设备" : "产品"} · ${choice.label}`}
                secondary={state.selected !== index}
                onPress={() => flow.choose(index)}
              />
            ))}
            {state.phase === "choosing" ? (
              <Button
                title="确认"
                disabled={action.busy || state.selected === undefined}
                onPress={() =>
                  void action.run(async () => {
                    try {
                      await showDestination(await flow.confirm());
                    } catch (error) {
                      const message = error instanceof Error ? error.message : String(error);
                      showToast(message);
                      if (flow.state.phase === "choosing") flow.reset();
                    }
                  })
                }
              />
            ) : (
              <Button
                title="核对设备绑定结果"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    try {
                      await showDestination(await flow.reconcile());
                    } catch (error) {
                      showToast(error instanceof Error ? error.message : String(error));
                    }
                  })
                }
              />
            )}
            {confirming && <Busy />}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={action.busy || picking}
            onPress={pickPhoto}
            style={[styles.albumButton, { bottom: height * 0.215 }]}
          >
            <Text style={styles.albumText}>{picking ? "正在识别图片…" : "使用相册"}</Text>
          </Pressable>
        )}
        {!!toast && (
          <View
            pointerEvents="none"
            style={[styles.toast, { bottom: Math.max(insets.bottom + 24, 42) }]}
          >
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ResultList({
  devices,
  onBack,
  onRetry,
}: {
  devices: DeviceView[];
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView style={styles.resultPage} edges={["top", "bottom"]}>
      <StatusBar hidden={false} barStyle="dark-content" />
      <View style={styles.resultHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回扫码"
          onPress={onBack}
          style={styles.resultBack}
        >
          <Text style={styles.resultChevron}>‹</Text>
        </Pressable>
        <Text style={styles.resultTitle}>扫一扫</Text>
        <View style={styles.resultBack} />
      </View>
      {devices.map((item) => (
        <Pressable
          key={item.device.id}
          onPress={() =>
            router.push({
              pathname: "/device/[id]",
              params: { id: item.device.id },
            })
          }
          style={styles.resultCard}
        >
          {item.product?.image ? (
            <Image
              source={{ uri: item.product.image }}
              resizeMode="contain"
              style={styles.resultImage}
            />
          ) : (
            <View style={styles.resultImagePlaceholder}>
              <Text style={styles.resultImageLetter}>
                {(item.product?.name || item.deviceNickname || "设").slice(0, 1)}
              </Text>
            </View>
          )}
          <View style={styles.resultInfo}>
            <Text numberOfLines={1} style={styles.resultName}>
              {item.product?.name || item.deviceNickname || "设备"}
            </Text>
            {!!item.product?.modelName && (
              <Text numberOfLines={1} style={styles.resultModel}>
                {item.product.modelName}
              </Text>
            )}
            <Text numberOfLines={1} style={styles.resultSerial}>
              SN.: {item.device.id}
            </Text>
          </View>
        </Pressable>
      ))}
      {devices.length === 0 && (
        <View style={styles.resultEmpty}>
          <Text style={styles.resultEmptyText}>设备绑定已确认，暂时无法加载设备信息</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>重新加载</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scanner: { flex: 1, backgroundColor: "#101010" },
  safeOverlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-start" },
  scrim: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scanHeader: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: { width: 42, height: 44, justifyContent: "center" },
  backChevron: {
    color: "#fff",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "300",
  },
  scanTitle: { color: "#fff", fontSize: 18, fontWeight: "500" },
  scanArea: { alignItems: "center" },
  scanFrame: { overflow: "hidden", justifyContent: "flex-start" },
  corner: {
    position: "absolute",
    width: 17,
    height: 17,
    borderColor: "#fff",
    borderWidth: 2,
  },
  corner_top_left: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  corner_top_right: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  corner_bottom_left: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  corner_bottom_right: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanBeam: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "transparent",
    shadowColor: "#FF9B25",
    shadowOpacity: 0.85,
    shadowRadius: 7,
  },
  instructions: { alignItems: "center", marginTop: 36, paddingHorizontal: 18 },
  instructionTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
    marginBottom: 19,
  },
  instructionBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  albumButton: {
    position: "absolute",
    left: "7%",
    right: "7%",
    height: 46,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  albumText: { fontSize: 16, fontWeight: "600", color: "#111" },
  choices: {
    position: "absolute",
    bottom: 32,
    left: "7%",
    right: "7%",
    gap: 10,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "84%",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  toastText: { color: "#fff", fontSize: 14, textAlign: "center" },
  developerTools: { position: "absolute", bottom: 0, left: 16, right: 16 },
  resultPage: { flex: 1, backgroundColor: "#F5F5F5" },
  resultHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  resultBack: { width: 42, height: 44, justifyContent: "center" },
  resultChevron: {
    color: "#111",
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "300",
  },
  resultTitle: { color: "#111", fontSize: 18, fontWeight: "600" },
  resultCard: {
    minHeight: 100,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    borderRadius: 13,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
  resultImage: { width: 44, height: 62 },
  resultImagePlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 8,
    backgroundColor: "#F1F2F3",
    alignItems: "center",
    justifyContent: "center",
  },
  resultImageLetter: { color: "#777", fontSize: 20 },
  resultInfo: { flex: 1, gap: 4 },
  resultName: { color: "#333", fontSize: 16, fontWeight: "500" },
  resultModel: { color: "#666", fontSize: 12 },
  resultSerial: { color: "#A7A7A7", fontSize: 12 },
  resultEmpty: { marginTop: 28, alignItems: "center", gap: 14 },
  resultEmptyText: { color: "#777", fontSize: 14 },
  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  retryText: { color: "#333", fontSize: 14 },
});
