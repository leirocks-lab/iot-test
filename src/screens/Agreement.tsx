import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useApp } from "../ui/context";
import { Busy } from "../ui/kit";
export default function Agreement() {
  const { runtime } = useApp(); const { kind, region, regionName, returnTo } = useLocalSearchParams<{ kind?: "privacy" | "serviceTerms"; region?: string; regionName?: string; returnTo?: string }>(); const [content, setContent] = useState(""); const [bottom, setBottom] = useState(false);
  useEffect(() => { if (!runtime || !kind) return; runtime.service.agreement(kind, region ?? "US").then((r) => setContent(r.content)).catch(() => setContent("暂时无法加载协议内容，请稍后重试。")); }, [runtime, kind, region]);
  if (!runtime) return <Busy />;
  return <View style={{ flex: 1, backgroundColor: "#f2f2f2", paddingTop: 52 }}><View style={{ height: 42, alignItems: "center", justifyContent: "center" }}><Pressable onPress={() => router.back()} style={{ position: "absolute", left: 16 }}><Text style={{ fontSize: 28 }}>‹</Text></Pressable><Text style={{ fontSize: 18, fontWeight: "600" }}>{kind === "privacy" ? "隐私协议" : "用户协议"}</Text></View><ScrollView style={{ margin: 16, backgroundColor: "#fff", borderRadius: 12, padding: 16 }} onScroll={({ nativeEvent }) => { const e = nativeEvent; if (e.contentOffset.y + e.layoutMeasurement.height >= e.contentSize.height - 12) setBottom(true); }} scrollEventThrottle={100}><Text style={{ color: "#555", fontSize: 14, lineHeight: 19 }}>{content}</Text></ScrollView><Pressable disabled={!bottom} onPress={() => router.replace({ pathname: returnTo === "/auth/login" ? "/auth/login" : "/auth/register", params: { agreed: kind, region, regionName } })} style={{ margin: 16, height: 46, borderRadius: 8, backgroundColor: bottom ? "#000" : "#bbb", alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{bottom ? "同意并继续" : "阅读全文，同意并继续"}</Text></Pressable></View>;
}
