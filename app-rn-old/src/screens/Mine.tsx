import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../ui/context";

const assets: Record<string, number> = {
  avatar: require("../../src/assets/我的/avatar.png"),
  settings: require("../../src/assets/我的/settings.png"),
  room: require("../../src/assets/我的/room.png"),
  language: require("../../src/assets/我的/language.png"),
  about: require("../../src/assets/我的/about.png"),
  contact: require("../../src/assets/我的/contact.png"),
  feedback: require("../../src/assets/我的/feedback.png"),
  website: require("../../src/assets/我的/website.png"),
  manual: require("../../src/assets/我的/manual.png"),
  voice: require("../../src/assets/我的/voice.png"),
  alexa: require("../../src/assets/我的/alexa.png"),
  google: require("../../src/assets/我的/google.png"),
  faq: require("../../src/assets/我的/faq.png"),
  chevron: require("../../src/assets/我的/chevron.png"),
  chevron2: require("../../src/assets/我的/chevron2.png"),
  chevron3: require("../../src/assets/我的/chevron3.png"),
  chevron4: require("../../src/assets/我的/chevron4.png"),
  chevron5: require("../../src/assets/我的/chevron5.png"),
  chevron6: require("../../src/assets/我的/chevron6.png"),
  chevron7: require("../../src/assets/我的/chevron7.png"),
  chevron8: require("../../src/assets/我的/chevron8.png"),
};
const rows = [
  ["room.png", "房间管理", ""],
  ["language.png", "语言", "跟随系统"],
  ["about.png", "关于", ""],
  ["contact.png", "联系我们", ""],
  ["feedback.png", "问题反馈", ""],
  ["website.png", "访问官网", ""],
  ["manual.png", "产品说明书", ""],
  ["faq.png", "常见问题", ""],
] as const;
const chevrons = [
  "chevron",
  "chevron2",
  "chevron3",
  "chevron4",
  "chevron5",
  "chevron6",
  "chevron7",
  "chevron8",
];
const rowActions = [
  () => router.push("/rooms"),
  () => router.push("/preferences"),
  () => router.push("/help"),
  () => router.push("/help"),
  () => router.push("/help"),
  () => undefined,
  () => router.push("/help"),
  () => router.push("/help"),
];

export default function Mine() {
  const { runtime } = useApp();
  const [profile, setProfile] = useState<{ nickname: string; emailMasked: string } | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!runtime) return undefined;
      let active = true;
      void runtime.service
        .profile()
        .then((value) => {
          if (active) setProfile({ nickname: value.nickname, emailMasked: value.emailMasked });
        })
        .catch(() => {
          // Keep the session-derived fallback when the profile request fails.
        });
      return () => {
        active = false;
      };
    }, [runtime]),
  );
  const user = runtime?.service.session?.userID ?? "jack";
  const fallbackName = user.split("@")[0] || "jack";
  const name = profile?.nickname || fallbackName;
  const email = profile?.emailMasked || (user.includes("@") ? user : "1***9@gmail.com");
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <Image
            source={assets["avatar".replace(".png", "")]}
            style={styles.avatar}
            contentFit="contain"
          />
          <View style={styles.profileText}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push("/preferences")}
          >
            <Image
              source={assets["settings".replace(".png", "")]}
              style={styles.settings}
              contentFit="contain"
            />
          </Pressable>
        </View>
        <View style={styles.list}>
          {rows.map(([icon, label, value], index) => (
            <Pressable key={label} style={styles.row} onPress={rowActions[index]}>
              <Image
                source={assets[icon.replace(".png", "")]}
                style={styles.rowIcon}
                contentFit="contain"
              />
              <Text style={styles.rowLabel}>{label}</Text>
              <View style={styles.rowRight}>
                {value ? <Text style={styles.value}>{value}</Text> : null}
                <Image
                  source={assets[chevrons[index].replace(".png", "")]}
                  style={styles.chevron}
                  contentFit="contain"
                />
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.voiceCard}>
          <View style={styles.voiceTitle}>
            <Text style={styles.voiceGlyph}>♧</Text>
            <Text style={styles.rowLabel}>语音控制</Text>
          </View>
          <View style={styles.voiceButtons}>
            <View style={styles.voiceButton}>
              <Text style={styles.alexaMark}>◯</Text>
              <Text style={styles.voiceText}>Alexa</Text>
            </View>
            <View style={styles.voiceButton}>
              <Text style={styles.googleMark}>●</Text>
              <Text style={styles.voiceText}>Google Assi…</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2f2f2" },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 100 },
  profile: {
    height: 97,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  avatar: { width: 51, height: 51, borderRadius: 12 },
  profileText: { marginLeft: 16, flex: 1 },
  name: { fontSize: 20, lineHeight: 28, fontWeight: "600", color: "#000" },
  email: { fontSize: 12, lineHeight: 16, color: "#999", marginTop: 4 },
  settings: { width: 24, height: 24 },
  list: { gap: 10 },
  row: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  rowIcon: { width: 24, height: 24 },
  rowLabel: { marginLeft: 16, fontSize: 16, lineHeight: 20, color: "#000" },
  rowRight: { marginLeft: "auto", flexDirection: "row", alignItems: "center" },
  value: { fontSize: 14, color: "#999", marginRight: 10 },
  chevron: { width: 20, height: 20 },
  voiceCard: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  voiceTitle: { flexDirection: "row", alignItems: "center" },
  voiceGlyph: { width: 24, textAlign: "center", color: "#00cbb8", fontSize: 22 },
  voiceButtons: { flexDirection: "row", gap: 16, marginTop: 12, marginLeft: 2 },
  voiceButton: {
    height: 50,
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  alexaMark: { color: "#00bfe8", fontSize: 25, marginRight: 6 },
  googleMark: { color: "#2c8df5", fontSize: 22, marginRight: 8 },
  voiceText: { fontSize: 14, color: "#000" },
});
