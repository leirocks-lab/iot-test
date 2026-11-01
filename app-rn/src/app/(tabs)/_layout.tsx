import { Redirect, Tabs, router } from "expo-router";
import { useState } from "react";
import { Image, ImageBackground, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
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
const barBackground = require("../../../assets/images/bottom-nav-background.png");
function BottomBar({ state, navigation }: any) {
  const [open, setOpen] = useState(false),
    current = state.routes[state.index]?.name;
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { runtime, navigationLocked } = useApp();
  const color = useColors();
  const barHeight = 43 + bottomInset;
  if (navigationLocked) return null;
  return (
    <View style={[styles.host, { height: barHeight }]}>
      {open && <Pressable style={styles.scrim} onPress={() => setOpen(false)} />}
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
              runtime?.onboarding.enterFromHome();
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
        <View pointerEvents="none" style={[styles.safeAreaFill, { height: bottomInset }]} />
        <ImageBackground
          source={barBackground}
          resizeMode="stretch"
          style={[styles.barBackground, { bottom: bottomInset }]}
        >
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            tintColor="rgba(242,242,242,0.8)"
            style={[styles.glassSegment, styles.glassLeft]}
          />
          <GlassView
            pointerEvents="none"
            glassEffectStyle="regular"
            tintColor="rgba(242,242,242,0.8)"
            style={[styles.glassSegment, styles.glassRight]}
          />
          <Svg
            pointerEvents="none"
            viewBox="0 0 374 43"
            preserveAspectRatio="none"
            style={styles.contourHighlight}
          >
            <Path
              d="M0 0H151 L152 1 L153 1 L154 2 L155 2 L156 3 L157 4 L158 5 L159 6 L160 8 L161 10 L162 16 L163 23 L164 26 L165 28 L166 30 L167 31 L168 32 L169 34 L170 35 L171 36 L172 36 L173 37 L174 38 L175 39 L176 39 L177 40 L178 40 L179 41 L180 41 L181 41 L182 42 H195 L196 41 L197 41 L198 40 L199 40 L200 39 L201 39 L202 38 L203 38 L204 37 L205 36 L206 36 L207 35 L208 34 L209 32 L210 31 L211 30 L212 28 L213 26 L214 23 L215 16 L216 10 L217 8 L218 6 L219 5 L220 4 L221 3 L222 2 L223 2 L224 1 L225 1 L226 0 H374"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity={0.9}
              strokeWidth={1}
            />
          </Svg>
          <View style={styles.barContent}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Home"
              style={styles.tab}
              onPress={() => navigation.navigate("home")}
            >
              <Image source={current === "home" ? homeSelected : home} style={styles.icon} />
            </Pressable>
            <View style={styles.centerSpace} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mine"
              style={styles.tab}
              onPress={() => navigation.navigate("mine")}
            >
              <Image source={current === "mine" ? mineSelected : mine} style={styles.icon} />
            </Pressable>
          </View>
        </ImageBackground>
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
  },
  barBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 43,
  },
  safeAreaFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(242,242,242,0.8)",
  },
  glassSegment: {
    position: "absolute",
    height: 43,
    backgroundColor: "rgba(242,242,242,0.06)",
  },
  glassLeft: { left: 0, width: "44%" },
  glassRight: { right: 0, width: "44%" },
  contourHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 43,
  },
  barContent: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  tab: {
    flex: 1,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
  },
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
