import { Redirect, Tabs, router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useApp, useColors } from "../../ui/context";
const home = require("../../../assets/images/home.png");
const homeSelected = require("../../../assets/images/home-selected.png");
const mine = require("../../../assets/images/my.png");
const mineSelected = require("../../../assets/images/my-selected.png");
const add = require("../../../assets/images/add.png");
const addOpen = require("../../../assets/images/add-open.png");
function BottomBar({ state, navigation }: any) {
  const [open, setOpen] = useState(false),
    current = state.routes[state.index]?.name;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const color = useColors();
  const barHeight = 43 + bottomInset;
  return (
    <View style={[styles.host, { height: barHeight }]}>
      {open && (
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
      )}
      {open && (
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setOpen(false);
              router.push("/add");
            }}
          >
            <Text style={styles.menuText}>＋ 添加设备</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setOpen(false);
              router.push("/scan");
            }}
          >
            <Text style={styles.menuText}>⌗ 扫一扫</Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.bar, { height: barHeight }]}>
        <Svg
          width="100%"
          height="58"
          viewBox="0 0 375 58"
          preserveAspectRatio="none"
        >
          <Path
            d="M0 0H375V58H0Z M140 0H151 C158 0 160 4 161 11 C164 30 174 43 187.5 43 C201 43 211 30 214 11 C215 4 217 0 224 0H235Z"
            // fill={"rgba(255,255,255,0.8)"}
            fill={color.background.invert}
            fillRule="evenodd"
          />
        </Svg>
        <View
          pointerEvents="none"
          style={[styles.safeAreaFill, { height: bottomInset }]}
        />
        <View style={[styles.barContent, { bottom: bottomInset, height: 43 }]}>
          <Pressable
            style={styles.tab}
            onPress={() => navigation.navigate("home")}
          >
            <Image
              source={current === "home" ? homeSelected : home}
              style={styles.icon}
            />
          </Pressable>
          <View style={styles.centerSpace} />
          <Pressable
            style={styles.tab}
            onPress={() => navigation.navigate("mine")}
          >
            <Image
              source={current === "mine" ? mineSelected : mine}
              style={styles.icon}
            />
          </Pressable>
        </View>
      </View>
      <Pressable
        style={[styles.addButton, { bottom: bottomInset - 20 }]}
        onPress={() => setOpen((v) => !v)}
      >
        <Image source={open ? addOpen : add} style={styles.addIcon} />
      </Pressable>
    </View>
  );
}
export default function TabLayout() {
  const { runtime, navigationLocked } = useApp();
  if (!runtime?.service.session) return <Redirect href="/auth" />;
  return (
    <Tabs
      tabBar={(props) => <BottomBar {...props} />}
      screenListeners={{
        tabPress: (e) => {
          if (navigationLocked) e.preventDefault();
        },
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="store" options={{ href: null }} />
      <Tabs.Screen name="mine" />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, bottom: 0, height: 43 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 43,
    backdropFilter: "blur(10px)",
  },
  safeAreaFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  barContent: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", height: 58 },
  centerSpace: { width: 86 },
  icon: { width: 40, height: 40, resizeMode: "contain" },
  addButton: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 29,
    left: "50%",
    marginLeft: -37,
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
  },
  addIcon: { width: 74, height: 74, resizeMode: "contain" },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -1000,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menu: {
    position: "absolute",
    bottom: 90,
    left: "50%",
    marginLeft: -72,
    width: 144,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 14,
    zIndex: 5,
    elevation: 8,
  },
  menuItem: { height: 42, justifyContent: "center", paddingHorizontal: 14 },
  menuText: { fontSize: 15, color: "#333" },
});
