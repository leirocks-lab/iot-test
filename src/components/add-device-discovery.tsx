import { Image } from "expo-image";
import { useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { DiscoveredDevice } from "../protocol/ble";
import type { Product } from "../services/models";
import { matchesDiscoveredProduct } from "../services/onboarding";
import { ProductThumbnail } from "./device/product-thumbnail";
import { SearchDevicesLoading } from "./search-devices-loading";

const EXPANDED = 300;
const COMPACT = 68;
const COLLAPSE_DISTANCE = EXPANDED - COMPACT;

export function AddDeviceDiscovery({
  scanning,
  devices,
  products,
  disabled,
  error,
  onBack,
  onRescan,
  onSelect,
  catalog,
  sheet,
}: {
  scanning: boolean;
  devices: readonly DiscoveredDevice[];
  products: readonly Product[];
  disabled: boolean;
  error?: string;
  onBack: () => void;
  onRescan: () => void;
  onSelect: (device: DiscoveredDevice) => void;
  catalog: ReactNode;
  sheet: ReactNode;
}) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const interpolate = (outputRange: number[]) =>
    scrollY.interpolate({
      inputRange: [0, COLLAPSE_DISTANCE],
      outputRange,
      extrapolate: "clamp",
    });
  const label = devices.length ? "已发现" : scanning ? "正在扫描附近蓝牙设备" : "未发现设备";
  const rescan = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    onRescan();
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={onBack}
          style={styles.back}
        >
          <Image
            source={require("../../assets/images/back-icon.png")}
            style={styles.backIcon}
            contentFit="contain"
          />
        </Pressable>
        <Text style={styles.pageTitle}>添加设备</Text>
      </View>
      <View
        style={styles.body}
        onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
      >
        <Animated.ScrollView
          ref={scrollRef}
          testID="device-discovery-scroll"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { minHeight: viewportHeight + COLLAPSE_DISTANCE },
          ]}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: false,
            })(event);
            setCollapsed(event.nativeEvent.contentOffset.y >= COLLAPSE_DISTANCE - 1);
          }}
        >
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          {devices.length > 0 && (
            <View style={styles.devices}>
              {devices.map((device) => {
                const matches = products.filter((product) =>
                  matchesDiscoveredProduct(device, product),
                );
                const product = matches.length === 1 ? matches[0] : undefined;
                return (
                  <Pressable
                    key={`${device.service.toLowerCase()}:${device.mac.toLowerCase()}`}
                    accessibilityRole="button"
                    accessibilityLabel={`添加 ${product?.name || device.model}，MAC ${device.mac}`}
                    disabled={disabled}
                    onPress={() => onSelect(device)}
                    style={({ pressed }) => [
                      styles.device,
                      pressed && styles.pressed,
                      disabled && styles.disabled,
                    ]}
                  >
                    <ProductThumbnail
                      source={product?.image}
                      name={product?.name || device.model}
                      style={styles.deviceImage}
                    />
                    <View style={styles.deviceCopy}>
                      <Text numberOfLines={1} style={styles.deviceName}>
                        {product?.name || device.model}
                      </Text>
                      <Text numberOfLines={1} style={styles.deviceModel}>
                        {device.model}
                      </Text>
                      <Text numberOfLines={1} style={styles.deviceMac}>
                        MAC: {device.mac.toUpperCase()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.manualDivider} />
          <Text style={styles.manualTitle}>搜不到设备？手动添加</Text>
          {catalog}
        </Animated.ScrollView>
        <Animated.View
          style={[styles.searchPanel, { height: interpolate([EXPANDED, COMPACT]) }]}
          pointerEvents="box-none"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.radar,
              {
                opacity: interpolate([1, 0]),
                transform: [{ translateY: interpolate([0, -80]) }],
              },
            ]}
          >
            <SearchDevicesLoading size={160} active={scanning} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.smallRadar, { opacity: interpolate([0, 1]) }]}
          >
            <SearchDevicesLoading size={40} active={scanning} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden={collapsed}
            importantForAccessibility={collapsed ? "no-hide-descendants" : "auto"}
            style={[
              styles.searchCopy,
              { top: 16, left: 0, right: 0, opacity: interpolate([1, 0]) },
            ]}
          >
            <Text numberOfLines={1} style={styles.searchTitle}>
              {label}
              {devices.length > 0 && <Text style={styles.count}> {devices.length} </Text>}
              {devices.length > 0 ? "个设备" : ""}
            </Text>
            <Text numberOfLines={1} style={styles.searchSubtitle}>
              请保持设备已接通电源，并在附近
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden={!collapsed}
            importantForAccessibility={!collapsed ? "no-hide-descendants" : "auto"}
            style={[
              styles.searchCopy,
              styles.compactCopy,
              {
                top: devices.length || !scanning ? 22 : 13,
                right: scanning ? 0 : 126,
                opacity: interpolate([0, 1]),
              },
            ]}
          >
            <Text numberOfLines={1} style={styles.compactTitle}>
              {label}
              {devices.length > 0 && <Text style={styles.count}> {devices.length} </Text>}
              {devices.length > 0 ? "个设备" : ""}
            </Text>
            {scanning && !devices.length && (
              <Text numberOfLines={1} style={styles.searchSubtitle}>
                请保持设备已接通电源，并在附近
              </Text>
            )}
          </Animated.View>
          {!scanning && (
            <Animated.View
              pointerEvents={collapsed ? "auto" : "none"}
              accessibilityElementsHidden={!collapsed}
              importantForAccessibility={!collapsed ? "no-hide-descendants" : "auto"}
              style={[styles.rescanWrap, { opacity: interpolate([0, 1]) }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重新扫描"
                disabled={disabled}
                onPress={rescan}
                style={({ pressed }) => [styles.rescan, pressed && styles.pressed]}
              >
                <Text style={styles.rescanText}>重新扫描</Text>
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
        {!scanning && !devices.length && !collapsed && (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="重新扫描"
              disabled={disabled}
              onPress={rescan}
              style={({ pressed }) => [
                styles.rescan,
                styles.footerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.rescanText}>重新扫描</Text>
            </Pressable>
          </View>
        )}
      </View>
      {sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F2F2F2" },
  navigation: {
    height: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  back: {
    position: "absolute",
    left: 8,
    top: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { width: 20, height: 20 },
  pageTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    color: "#111111",
  },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    overflow: "hidden",
  },
  content: { paddingTop: EXPANDED, paddingHorizontal: 16, paddingBottom: 32 },
  searchPanel: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: "#F2F2F2",
    overflow: "hidden",
  },
  radar: { position: "absolute", top: 98, alignSelf: "center" },
  smallRadar: { position: "absolute", left: 4, top: 14 },
  searchCopy: { position: "absolute", alignItems: "center" },
  compactCopy: { left: 60, alignItems: "flex-start" },
  searchTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#111111",
  },
  compactTitle: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "600",
    color: "#111111",
  },
  searchSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#999999",
  },
  count: { color: "#1677C8" },
  rescanWrap: { position: "absolute", right: 0, top: 16 },
  rescan: {
    height: 36,
    width: 120,
    borderRadius: 8,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  rescanText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    paddingTop: 8,
    backgroundColor: "#F2F2F2",
  },
  footerButton: { width: "100%", height: 46 },
  devices: { gap: 10, marginBottom: 20 },
  device: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    boxShadow: "0px 2px 12px rgba(0,0,0,0.03)",
  },
  deviceImage: { width: 64, height: 64, marginRight: 12 },
  deviceCopy: { flex: 1, gap: 3 },
  deviceName: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
    color: "#333333",
  },
  deviceModel: { fontSize: 12, lineHeight: 18, color: "#444444" },
  deviceMac: { fontSize: 12, lineHeight: 18, color: "#999999" },
  manualDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5E5",
  },
  manualTitle: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 22,
    color: "#111111",
  },
  error: { color: "#C73535", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
