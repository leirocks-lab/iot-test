import { Redirect, Tabs, router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useApp, useColors } from "../../ui/context";
const home = require("../../../assets/images/home.png");
const homeSelected = require("../../../assets/images/home-selected.png");
const mine = require("../../../assets/images/my.png");
const mineSelected = require("../../../assets/images/my-selected.png");
const add = require("../../../assets/images/add.png");
const addOpen = require("../../../assets/images/add-open.png");
const barAdd = require("../../../assets/images/bar-add.png");
const barScan = require("../../../assets/images/bar-scan.png");
function BottomBar({ state, navigation }: any) {
  const [open, setOpen] = useState(false),
    current = state.routes[state.index]?.name;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { navigationLocked } = useApp();
  const color = useColors();
  const barHeight = 43 + bottomInset;
  if (navigationLocked) return null;
  return (
    <View style={[styles.host, { height: barHeight }]}>
      {open && (
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
      )}
      {open && (
        <View
          style={[
            styles.menu,
            {
              bottom: 56 + bottomInset,
            },
          ]}
        >
          <Pressable
            style={[
              styles.menuItem,
              {
                borderBottomWidth: 1,
                borderBottomColor: color.background.split,
              },
            ]}
            onPress={() => {
              setOpen(false);
              router.push("/add");
            }}
          >
            <View style={styles.menuRow}>
              <Image source={barAdd} style={styles.menuIcon} />
              <Text style={styles.menuText}>添加设备</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setOpen(false);
              router.push("/scan");
            }}
          >
            <View style={styles.menuRow}>
              <Image source={barScan} style={styles.menuIcon} />
              <Text style={styles.menuText}>扫一扫</Text>
            </View>
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
        style={[
          styles.addButton,
          {
            bottom: Platform.select({
              ios: bottomInset - 25,
              android: 10,
              web: -10,
            }),
          },
        ]}
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
    position: "fixed",
    width: 74,
    height: 74,
    borderRadius: 29,
    left: "50%",
    marginLeft: -37,
    alignItems: "center",
    justifyContent: "center",
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
    bottom: 56,
    left: "50%",
    marginLeft: -71,
    width: 142,
    backgroundColor: "#fff",
    borderRadius: 12,
    zIndex: 5,
    elevation: 8,
  },
  menuItem: {
    height: 38,
    justifyContent: "center",
    marginHorizontal: 12,
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: { width: 20, height: 20, resizeMode: "contain" },
  menuText: { fontSize: 14, color: "#333" },
});
